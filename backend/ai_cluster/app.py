from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from collections import defaultdict
from sklearn.cluster import AgglomerativeClustering
import asyncio

# --- Infrastructure imports ---
from rag.pipeline import setup_opensearch_index, index_document, get_embedding_model, get_reranker, search_hybrid
from rag.llm import AmaliaLLM
from rag.constants import MAX_HISTORY_TURNS
from rag.rag import ChatTurn, run_rag_chat
from nemoguardrails import LLMRails, RailsConfig
from nemoguardrails.llm.providers import register_llm_provider

# ── Application state ─────────────────────────────────────────────────────────
app = FastAPI()
rag_rails = None
_model = None  # Cluster embedding model (lazy-loaded)

# In-memory conversation history: session_id → ordered list of Q&A turns.
# Trimmed to MAX_HISTORY_TURNS * 2 to prevent unbounded memory growth.
_sessions: dict[str, list[ChatTurn]] = defaultdict(list)


# ── Model loading ─────────────────────────────────────────────────────────────

def get_cluster_model():
    global _model
    if _model is None:
        print("Loading MiniLM-L6 embedding model for clustering...")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


async def background_load_models():
    """Pre-load all models in the background to avoid blocking the first request."""
    print("Pre-loading models in the background...")
    try:
        # Load embedding model for RAG
        await asyncio.to_thread(get_embedding_model)
        # Load cross-encoder reranker for RAG
        await asyncio.to_thread(get_reranker)
        # Load clustering model
        await asyncio.to_thread(get_cluster_model)
        print("All models successfully pre-loaded.")
    except Exception as e:
        print(f"Error pre-loading models: {e}")


@app.on_event("startup")
async def startup():
    asyncio.create_task(background_load_models())

    global rag_rails

    print("Setting up OpenSearch...")
    for i in range(10):
        try:
            setup_opensearch_index()
            print("OpenSearch index setup complete.")
            break
        except Exception as e:
            print(f"OpenSearch not ready (attempt {i+1}/10). Retrying in 5 seconds...")
            await asyncio.sleep(5)
    else:
        print("Warning: Could not setup OpenSearch index on startup after multiple retries.")

    print("Initializing NeMo Guardrails...")
    try:
        register_llm_provider("amalia_custom_llm", AmaliaLLM)
        config = RailsConfig.from_path("./rag/config")
        rag_rails = LLMRails(config)
        print("NeMo Guardrails initialized.")
    except Exception as e:
        print(f"Warning: Could not initialize NeMo Guardrails. Error: {e}")
        rag_rails = None


# ── Clustering / Embedding endpoints ─────────────────────────────────────────

class Item(BaseModel):
    title: str
    link: Optional[str] = None


class VectorsRequest(BaseModel):
    vectors: list[list[float]]


@app.post("/embed")
async def embed_endpoint(item: Item):
    if not item.title or not item.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    try:
        vector = get_cluster_model().encode(item.title).tolist()
        return {"embedding": vector}
    except Exception as e:
        print(f"Error encoding title: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed_query")
async def embed_query_endpoint(query: str):
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        vector = get_cluster_model().encode(query).tolist()
        return {"embedding": vector}
    except Exception as e:
        print(f"Error encoding query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cluster")
def cluster_endpoint(items: list[str]):
    embeddings = get_cluster_model().encode(items)
    cluster_model = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=0.3,
        metric='cosine',
        linkage='average',
    )
    labels = cluster_model.fit_predict(embeddings).tolist()
    return {"labels": labels, "embeddings": embeddings.tolist()}


@app.post("/cluster_vectors")
def cluster_vectors_endpoint(req: VectorsRequest):
    vectors = req.vectors

    if not vectors or len(vectors) < 2:
        raise HTTPException(status_code=400, detail="At least 2 vectors are required")

    cluster_model = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=0.42,
        metric='cosine',
        linkage='average',
    )
    labels = cluster_model.fit_predict(vectors).tolist()
    return {"labels": labels}


# ── RAG endpoints ─────────────────────────────────────────────────────────────

class IndexSummaryRequest(BaseModel):
    id: str
    text: str
    topic: str
    url: str
    original_summary: str
    publishedAt: str
    title: str = ""


@app.post("/index_summary")
async def index_summary_endpoint(req: IndexSummaryRequest):
    try:
        result = index_document(
            req.id, req.text, req.topic, req.url,
            req.original_summary, req.publishedAt, req.title,
        )
        return result
    except Exception as e:
        print(f"Error indexing summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SearchNewsRequest(BaseModel):
    query: str
    topic: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    limit: Optional[int] = 20
    debug: bool = False


@app.post("/search_news")
async def search_news_endpoint(req: SearchNewsRequest):
    """
    Search for news articles using OpenSearch hybrid search pipeline.
    Returns ranked documents from the OpenSearch index.
    """
    try:
        requested_limit = max(1, min(req.limit or 20, 50))
        candidate_k = max(12, requested_limit * 2)

        # search_hybrid returns (results, debug_trace) if include_debug=True, else just results
        search_result = search_hybrid(
            query=req.query,
            k=candidate_k,
            topic=req.topic,
            date_from=req.date_from,
            date_to=req.date_to,
            fast_mode=True,
            # Keep user search fast: OpenSearch hybrid retrieval without cross-encoder reranking.
            apply_reranking=False,
            apply_deduplication=True,
            final_top_n=requested_limit,
            include_debug=req.debug
        )
        
        # Unpack based on whether debug was requested
        if req.debug:
            results, debug_info = search_result
        else:
            results = search_result
            debug_info = None
        
        response = {
            "results": results,
            "count": len(results),
        }
        if req.debug and debug_info:
            response["debug"] = debug_info
            
        return response
    except Exception as e:
        print(f"Error in search_news: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class RagChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    # Optional overrides — auto-detected from the query if omitted
    topic: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    debug: bool = False


@app.post("/rag_chat")
async def rag_chat_endpoint(req: RagChatRequest):
    """
    Thin orchestrator: delegates pipeline execution to rag.run_rag_chat()
    and manages the in-memory session history.
    """
    history = _sessions[req.session_id][-MAX_HISTORY_TURNS:]

    result = await run_rag_chat(
        message=req.message,
        session_id=req.session_id,
        history=history,
        rails=rag_rails,
        topic=req.topic,
        date_from=req.date_from,
        date_to=req.date_to,
        include_debug=req.debug,
    )

    # Persist the new turn only when the pipeline produced an answer
    if result["new_turn"] is not None:
        _sessions[req.session_id].append(result["new_turn"])
        # Trim to prevent unbounded memory growth
        if len(_sessions[req.session_id]) > MAX_HISTORY_TURNS * 2:
            _sessions[req.session_id] = _sessions[req.session_id][-MAX_HISTORY_TURNS * 2:]

    resp = {
        "answer": result["answer"],
        "sources": result["sources"],
        "query_info": result["query_info"],
    }
    if req.debug:
        resp["debug"] = result.get("debug")

    return resp


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True, "rails_loaded": rag_rails is not None}
