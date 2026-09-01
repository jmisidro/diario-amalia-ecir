"""
RAG Pipeline — Advanced Retrieval

Steps implemented:
  1. RRF Hybrid Search (Python-side Reciprocal Rank Fusion)
  2. Metadata Filtering (topic + date range)
  3. Cross-Encoder Reranking
  4. Recency Decay Scoring
  5. Deduplication
"""

import math
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from opensearchpy import OpenSearch
from sentence_transformers import SentenceTransformer, CrossEncoder

from .constants import (
    OPENSEARCH_URL,
    OPENSEARCH_PASSWORD,
    INDEX_NAME,
    EMBEDDING_MODEL_NAME,
    EMBEDDING_DIMENSION,
    RERANKER_MODEL_NAME,
    RRF_K_CONSTANT,
    CANDIDATE_K,
    FINAL_TOP_N,
    RECENCY_LAMBDA,
    DEDUP_THRESHOLD,
)

# ── OpenSearch Client ─────────────────────────────────────────────────────────

os_client = OpenSearch(
    hosts=[OPENSEARCH_URL],
    http_auth=("admin", OPENSEARCH_PASSWORD),
    use_ssl=False,
    verify_certs=False,
    ssl_assert_hostname=False,
    ssl_show_warn=False,
)

# ── Lazy-loaded Models ────────────────────────────────────────────────────────

_embedding_model = None
_reranker_model = None


def get_embedding_model() -> SentenceTransformer:
    """Load the bi-encoder embedding model on first use."""
    global _embedding_model
    if _embedding_model is None:
        print(f"Loading embedding model '{EMBEDDING_MODEL_NAME}'...")
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print(f"Embedding model loaded. Dimension: {EMBEDDING_DIMENSION}")
    return _embedding_model


def get_reranker() -> CrossEncoder:
    """Load the cross-encoder reranker model on first use (Step 3)."""
    global _reranker_model
    if _reranker_model is None:
        print(f"Loading reranker model '{RERANKER_MODEL_NAME}'...")
        _reranker_model = CrossEncoder(RERANKER_MODEL_NAME)
        print("Reranker model loaded.")
    return _reranker_model


def encode_text(text: str) -> list[float]:
    """Generate an embedding vector for a given text."""
    model = get_embedding_model()
    return model.encode(text).tolist()


# ── Index Setup ───────────────────────────────────────────────────────────────

def setup_opensearch_index():
    """Create the OpenSearch index with kNN enabled if it does not exist."""

    if not os_client.indices.exists(index=INDEX_NAME):
        index_body = {
            "settings": {
                "index": {
                    "knn": True,
                    "knn.algo_param.ef_search": 100
                },
                "analysis": {
                    "analyzer": {
                        "portuguese": {
                            "type": "portuguese"
                        }
                    }
                }
            },
            "mappings": {
                "properties": {
                    "summary_text": {
                        "type": "text",
                        "analyzer": "portuguese"
                    },
                    "embedding": {
                        "type": "knn_vector",
                        "dimension": EMBEDDING_DIMENSION,
                        "method": {
                            "name": "hnsw",
                            "space_type": "cosinesimil",
                            "engine": "lucene"
                        }
                    },
                    "title": {"type": "text"},
                    "topic": {"type": "keyword"},
                    "url": {"type": "keyword"},
                    "original_summary": {"type": "text"},
                    "publishedAt": {"type": "date"}
                }
            }
        }

        os_client.indices.create(index=INDEX_NAME, body=index_body)
        print(f"Created OpenSearch index '{INDEX_NAME}' (dimension={EMBEDDING_DIMENSION}).")
    else:
        print(f"OpenSearch index '{INDEX_NAME}' already exists.")


# ── Document Indexing ─────────────────────────────────────────────────────────

def index_document(document_id, text, topic, url, original_summary, publishedAt, title=""):
    """Generate embedding locally and index the document into OpenSearch."""

    embedding = encode_text(text)

    doc = {
        "summary_text": text,
        "embedding": embedding,
        "title": title,
        "topic": topic,
        "url": url,
        "original_summary": original_summary,
        "publishedAt": publishedAt
    }

    os_client.index(index=INDEX_NAME, id=document_id, body=doc, refresh=True)
    return {"status": "success", "id": document_id}


# ── Step 1: Reciprocal Rank Fusion (RRF) ─────────────────────────────────────

def _search_knn(query_vector: list[float], k: int, topic: Optional[str] = None,
                date_from: Optional[str] = None, date_to: Optional[str] = None,
                fast_mode: bool = False) -> list[dict]:
    """Pure kNN vector search with optional metadata filtering."""
    filter_clauses = _build_filters(topic, date_from, date_to)
    
    knn_query = {
        "vector": query_vector,
        "k": k,
    }
    if filter_clauses:
        knn_query["filter"] = {"bool": {"must": filter_clauses}}

    body = {
        "size": k,
        "query": {
            "knn": {
                "embedding": knn_query
            }
        }
    }
    if fast_mode:
        body["_source"] = ["summary_text", "title", "topic", "url", "original_summary", "publishedAt"]
    response = os_client.search(index=INDEX_NAME, body=body)
    return response["hits"]["hits"]


def _search_bm25(query: str, k: int, topic: Optional[str] = None,
                 date_from: Optional[str] = None, date_to: Optional[str] = None,
                 fast_mode: bool = False) -> list[dict]:
    """Pure BM25 text search with optional metadata filters (Step 2)."""
    must_clauses = [
        {"match": {"summary_text": {"query": query}}}
    ]
    filter_clauses = _build_filters(topic, date_from, date_to)

    body = {
        "size": k,
        "query": {
            "bool": {
                "must": must_clauses,
                "filter": filter_clauses
            }
        }
    }
    if fast_mode:
        body["_source"] = ["summary_text", "title", "topic", "url", "original_summary", "publishedAt"]
    response = os_client.search(index=INDEX_NAME, body=body)
    return response["hits"]["hits"]


# ── Step 2: Metadata Filtering (integrated into _search_bm25 above) ──────────

def _build_filters(topic: Optional[str] = None,
                   date_from: Optional[str] = None,
                   date_to: Optional[str] = None) -> list[dict]:
    """Build OpenSearch filter clauses for topic and date range (Step 2)."""
    filters = []
    if topic:
        filters.append({"term": {"topic": topic}})
    if date_from or date_to:
        date_range = {}
        if date_from:
            date_range["gte"] = date_from
        if date_to:
            # Append ||/d to round up to the end of the day in OpenSearch
            date_range["lte"] = f"{date_to}||/d"
        filters.append({"range": {"publishedAt": date_range}})
    return filters


def _rrf_merge(knn_hits: list[dict], bm25_hits: list[dict],
               k_constant: int = RRF_K_CONSTANT) -> list[dict]:
    """
    Reciprocal Rank Fusion — merges two ranked lists without score normalisation.
    RRF score for document d = Σ 1 / (k + rank(d)) across all lists.
    """
    scores: dict[str, dict] = {}

    for rank, hit in enumerate(knn_hits):
        doc_id = hit["_id"]
        if doc_id not in scores:
            scores[doc_id] = {"hit": hit, "rrf_score": 0.0}
        scores[doc_id]["rrf_score"] += 1.0 / (k_constant + rank + 1)

    for rank, hit in enumerate(bm25_hits):
        doc_id = hit["_id"]
        if doc_id not in scores:
            scores[doc_id] = {"hit": hit, "rrf_score": 0.0}
        scores[doc_id]["rrf_score"] += 1.0 / (k_constant + rank + 1)

    # Sort by RRF score descending
    merged = sorted(scores.values(), key=lambda x: x["rrf_score"], reverse=True)
    return merged


# ── Step 3: Cross-Encoder Reranking ⭐ ────────────────────────────────────────

def rerank(query: str, docs: list[dict], top_n: int = FINAL_TOP_N) -> list[dict]:
    """
    Re-score candidates using a cross-encoder for query–document joint attention.
    Returns the top_n documents sorted by reranker score.
    """
    if not docs:
        return docs

    reranker = get_reranker()
    pairs = [(query, d["summary_text"]) for d in docs]
    scores = reranker.predict(pairs)

    # Attach reranker score to each doc
    for doc, score in zip(docs, scores):
        doc["reranker_score"] = float(score)

    ranked = sorted(docs, key=lambda d: d["reranker_score"], reverse=True)
    return ranked[:top_n]


# ── Step 4: Recency Decay ────────────────────────────────────────────────────

def apply_recency_decay(docs: list[dict], λ: float = RECENCY_LAMBDA) -> list[dict]:
    """
    Multiply each document's score by exp(-λ × age_in_days).
    Applied BEFORE reranking so recency influences candidate selection.
    """
    now = datetime.now(timezone.utc)

    for doc in docs:
        try:
            pub_str = doc.get("publishedAt", "")
            if not pub_str:
                continue
            # Handle both ISO format and epoch millis from OpenSearch
            if isinstance(pub_str, (int, float)):
                pub = datetime.fromtimestamp(pub_str / 1000, tz=timezone.utc)
            else:
                pub = datetime.fromisoformat(str(pub_str).replace("Z", "+00:00"))
            age_days = max((now - pub).days, 0)
            decay = math.exp(-λ * age_days)
            doc["score"] = doc.get("score", 0.0) * decay
        except Exception:
            pass  # Leave score unchanged if date is malformed

    return sorted(docs, key=lambda d: d.get("score", 0), reverse=True)


# ── Step 5: Deduplication ────────────────────────────────────────────────────

def deduplicate(docs: list[dict], threshold: float = DEDUP_THRESHOLD) -> list[dict]:
    """
    Remove near-duplicate documents based on cosine similarity of embeddings.
    Uses the embedding model to encode summary_text for each candidate.
    """
    if len(docs) <= 1:
        return docs

    model = get_embedding_model()
    # Use original_summary for strict content comparison, ignoring title variance
    texts = [d.get("original_summary") or d.get("summary_text", "") for d in docs]
    vecs = model.encode(texts)

    # Normalise for cosine similarity
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    # Avoid division by zero
    norms = np.where(norms == 0, 1, norms)
    vecs_normed = vecs / norms
    sim_matrix = vecs_normed @ vecs_normed.T

    kept = []
    dropped: set[int] = set()
    for i in range(len(docs)):
        if i in dropped:
            continue
        kept.append(docs[i])
        for j in range(i + 1, len(docs)):
            if j not in dropped and sim_matrix[i, j] >= threshold:
                dropped.add(j)
                print(f"[Dedup] Dropped doc '{docs[j].get('title', docs[j]['id'])}' "
                      f"(sim={sim_matrix[i, j]:.3f} with '{docs[i].get('title', docs[i]['id'])}')")

    return kept


# ── Main Search Pipeline ─────────────────────────────────────────────────────

def search_hybrid(query: str, k: int = CANDIDATE_K,
                  topic: Optional[str] = None,
                  date_from: Optional[str] = None,
                  date_to: Optional[str] = None,
                  fast_mode: bool = False,
                  apply_reranking: bool = True,
                  apply_deduplication: bool = True,
                  final_top_n: int = FINAL_TOP_N,
                  include_debug: bool = False):
    """
    Advanced hybrid search pipeline:
      1. Run kNN + BM25 independently
      2. Merge via Reciprocal Rank Fusion (RRF)
      3. Apply metadata filters (topic, date range) via BM25 query
      4. Apply recency decay
      5. Deduplicate
      6. Rerank with cross-encoder
    """
    # Generate query embedding
    query_vector = encode_text(query)
    
    debug_trace = {} if include_debug else None

    try:
        # Step 1: Run both searches independently
        knn_hits = _search_knn(
            query_vector,
            k,
            topic=topic,
            date_from=date_from,
            date_to=date_to,
            fast_mode=fast_mode,
        )
        bm25_hits = _search_bm25(
            query,
            k,
            topic=topic,
            date_from=date_from,
            date_to=date_to,
            fast_mode=fast_mode,
        )
        
        if include_debug:
            debug_trace["knn_results_count"] = len(knn_hits)
            debug_trace["knn_results"] = [
                {"id": h["_id"], "score": h.get("_score", 0), "title": h["_source"].get("title", "")}
                for h in knn_hits
            ]
            debug_trace["bm25_results_count"] = len(bm25_hits)
            debug_trace["bm25_results"] = [
                {"id": h["_id"], "score": h.get("_score", 0), "title": h["_source"].get("title", "")}
                for h in bm25_hits
            ]
            debug_trace["filters"] = {"topic": topic, "date_from": date_from, "date_to": date_to}

        # Step 1: Merge via RRF
        merged = _rrf_merge(knn_hits, bm25_hits)
        
        if include_debug:
            debug_trace["rrf_merged_count"] = len(merged)
            debug_trace["rrf_merged"] = [
                {"id": m["hit"]["_id"], "rrf_score": m["rrf_score"], "title": m["hit"]["_source"].get("title", "")}
                for m in merged
            ]

    except Exception as e:
        print(f"[Search] Hybrid search failed: {e}. Falling back to BM25 only.")
        try:
            bm25_hits = _search_bm25(
                query,
                k,
                topic=topic,
                date_from=date_from,
                date_to=date_to,
                fast_mode=fast_mode,
            )
            merged = [{"hit": h, "rrf_score": 1.0 / (RRF_K_CONSTANT + i + 1)}
                      for i, h in enumerate(bm25_hits)]
            if include_debug:
                debug_trace["error"] = str(e)
                debug_trace["fallback_bm25_count"] = len(merged)
        except Exception as e2:
            print(f"[Search] BM25 fallback also failed: {e2}")
            return ([], debug_trace) if include_debug else []

    # Convert hits to result dicts
    results = []
    for entry in merged:
        hit = entry["hit"]
        source = hit["_source"]
        results.append({
            "id": hit["_id"],
            "score": entry["rrf_score"],
            "summary_text": source.get("summary_text", ""),
            "title": source.get("title", ""),
            "topic": source.get("topic", "N/A"),
            "url": source.get("url", ""),
            "original_summary": source.get("original_summary", ""),
            "publishedAt": source.get("publishedAt", "")
        })

    if not results:
        return (results, debug_trace) if include_debug else results

    # Step 4: Recency decay
    # Skip decay when explicit date filters are active: the OpenSearch filter
    # clause already constrains the result set to the requested time window, so
    # additionally penalising those articles by age would unfairly suppress
    # historical results the user explicitly asked about.
    date_filters_active = bool(date_from or date_to)
    if not date_filters_active:
        results = apply_recency_decay(results)
        if include_debug:
            debug_trace["recency_decay"] = [
                {"id": d.get("id"), "title": d.get("title", ""), "score_after_decay": d.get("score")}
                for d in results[:5]
            ]
    else:
        if include_debug:
            debug_trace["recency_decay"] = {"skipped": True, "reason": "explicit date filter active"}

    # Step 5: Deduplication
    # Default behavior (fast_mode=False): always deduplicate (legacy behavior).
    # Fast mode: allow caller to disable dedup for lower latency.
    should_deduplicate = True if not fast_mode else apply_deduplication
    if should_deduplicate:
        pre_dedup_count = len(results)
        results = deduplicate(results)
        if include_debug:
            debug_trace["dedup"] = {"before": pre_dedup_count, "after": len(results)}

    # Step 3: Cross-encoder reranking (most expensive — do last on cleaned set)
    if apply_reranking:
        results = rerank(query, results, top_n=final_top_n)
        if include_debug:
            debug_trace["reranked"] = [
                {"id": d.get("id"), "title": d.get("title", ""), "reranker_score": d.get("reranker_score")}
                for d in results
            ]
    else:
        results = results[:final_top_n]

    return (results, debug_trace) if include_debug else results
