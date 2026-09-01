"""
rag/rag.py — RAG Chat Pipeline
================================
Encapsulates the full multi-step RAG chat flow so that app.py remains a
thin FastAPI entrypoint focused on HTTP concerns and application state.

Public API
----------
- ChatTurn           TypedDict for a single Q&A history entry
- assemble_context() Build the labelled, budget-capped context string
- run_rag_chat()     Execute the full pipeline and return a structured result
"""

from typing import TypedDict, Optional

from rag.pipeline import search_hybrid
from rag.query_processor import process_query, detect_topic
from rag.llm import AmaliaLLM
from rag.constants import LLM_PROMPTS, MAX_CONTEXT_CHARS, MAX_HISTORY_TURNS, NODE_ENV


# ── Domain types ──────────────────────────────────────────────────────────────

class ChatTurn(TypedDict):
    """A single completed exchange stored in the session history."""
    q: str   # user question
    a: str   # assistant answer


class RagChatResult(TypedDict):
    """Structured return value of run_rag_chat()."""
    answer: str
    sources: list
    query_info: dict
    new_turn: Optional[ChatTurn]  # None when the request was rejected early
    debug: Optional[dict]


# ── Context assembly ──────────────────────────────────────────────────────────

def assemble_context(docs: list[dict], max_chars: int = MAX_CONTEXT_CHARS) -> str:
    """
    Build a [N]-labelled context string from retrieved documents.

    Enforces a character budget so the final prompt stays within the LLM's
    context window.  Documents are processed in ranking order; any document
    that would exceed the budget is silently dropped.
    """
    parts: list[str] = []
    total = 0

    for i, d in enumerate(docs):
        title = d.get("title", "Sem título")
        date = str(d.get("publishedAt", ""))[:10]
        
        # Use original_summary to avoid duplicating the title in the context window
        content = d.get("original_summary") or d.get("summary_text", "")
        entry = f"[{i + 1}] {content} (Fonte: {title}, {date})"

        if total + len(entry) > max_chars:
            print(f"[Context] Budget exceeded at doc {i + 1}/{len(docs)}. Truncating.")
            break

        parts.append(entry)
        total += len(entry)

    return "\n\n".join(parts)


def clean_evaluator_response(text: str) -> str:
    """Strip conversational meta-commentary added by the evaluator."""
    import re
    # Remove leading conversational filler
    text = re.sub(
        r'^(Compreendo|Entendido)\.?\s*(A resposta (final )?revista,? de acordo com as regras estabelecidas,? é:)?\s*',
        '', text, flags=re.IGNORECASE
    )
    # Remove notes/comments at the end of the text
    sentences = re.split(r'(?<=[.!?])\s+', text)
    cleaned_sentences = []
    for s in sentences:
        s_strip = s.strip()
        if (s_strip.lower().startswith("note que") or 
            s_strip.lower().startswith("note-se que") or 
            s_strip.lower().startswith("nota:") or 
            s_strip.lower().startswith("(nota:") or 
            s_strip.lower().startswith("esta resposta é baseada") or
            s_strip.lower().startswith("note-se") or
            s_strip.lower().startswith("compreendo") or
            s_strip.lower().startswith("entendido")):
            continue
        cleaned_sentences.append(s)
    
    cleaned_text = " ".join(cleaned_sentences).strip()
    if cleaned_text.startswith('"') and cleaned_text.endswith('"'):
        cleaned_text = cleaned_text[1:-1].strip()
    return cleaned_text


# ── Main pipeline ─────────────────────────────────────────────────────────────

async def run_rag_chat(
    message: str,
    session_id: str,
    history: list[ChatTurn],
    rails,
    *,
    topic: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_debug: bool = False,
) -> RagChatResult:
    """
    Execute the full RAG chat pipeline.

    Steps
    -----
    1. Guardrails — reject off-topic questions before any expensive work
    2. Query understanding — extract dates, topic, rewrite for retrieval
    3. Hybrid search — RRF, metadata filter, rerank, dedup
    4. Context assembly — labelled + token-budgeted
    5. History formatting — inject recent Q&A turns into the prompt
    6. LLM generation — call the AMALIA model

    Parameters
    ----------
    message     : Raw user message
    session_id  : Identifies the conversation (used only for logging here;
                  history is passed in explicitly by the caller)
    history     : Recent ChatTurn entries from the caller's session store
    rails       : Initialised LLMRails instance, or None if unavailable
    topic       : Optional hard override for the topic filter
    date_from   : Optional ISO date lower bound
    date_to     : Optional ISO date upper bound

    Returns
    -------
    RagChatResult with answer, sources, query_info and the new ChatTurn to
    append to the session store (or None on early rejection).
    """

    debug_info = {} if include_debug else None

    # ── Step 1: Guardrails ────────────────────────────────────────────────────
    if rails:
        try:
            guard_messages = [{"role": "user", "content": message}]
            guard_response = await rails.generate_async(messages=guard_messages)
            if NODE_ENV == "development":
                print(f"[RAG DEBUG] Guardrails response: {repr(guard_response)}")

            guard_text = ""
            if isinstance(guard_response, dict):
                guard_text = guard_response.get("content", "") or ""
            elif hasattr(guard_response, "content"):
                guard_text = guard_response.content or ""
            elif isinstance(guard_response, str):
                guard_text = guard_response
            guard_text = guard_text.strip()

            OFF_TOPIC_MARKERS = [
                "focado estritamente em notícias",
                "apenas posso ajudar",
                "assistente do Diário do AMALIA",
            ]
            if guard_text and any(
                m in guard_text.lower() for m in [mk.lower() for mk in OFF_TOPIC_MARKERS]
            ):
                print(f"[RAG INFO] Off-topic detected: '{guard_text}'. Returning guardrail response.")
                if include_debug:
                    debug_info["guardrails"] = {"guard_text": guard_text, "off_topic_detected": True}
                return RagChatResult(
                    answer=guard_text,
                    sources=[],
                    query_info={},
                    new_turn=None,
                    debug=debug_info,
                )
            print(f"[RAG DEBUG] Guardrails check passed. Guard text: '{guard_text}'")
            if include_debug:
                debug_info["guardrails"] = {"guard_text": guard_text, "off_topic_detected": False}
        except Exception as e:
            error_str = str(e)
            print(f"[RAG WARNING] Guardrails check failed: {error_str}")
            if include_debug:
                debug_info["guardrails"] = {"guard_text": None, "off_topic_detected": False, "error": error_str}
            
            # If the backend LLM is completely down, do not proceed with empty filters
            if "Erro ao comunicar com o modelo AMALIA" in error_str:
                return RagChatResult(
                    answer="Desculpe, não consegui gerar uma resposta neste momento. Por favor, tente novamente.",
                    sources=[],
                    query_info={
                        "detected_topic": None,
                        "filter_topic": topic,
                        "date_range": [date_from, date_to],
                        "clean_query": message,
                        "intent": "Informational",
                        "entities": []
                    },
                    new_turn=None,
                    debug=debug_info,
                )

    # ── Step 2: Query understanding ───────────────────────────────────────────
    llm = AmaliaLLM()
    query_info = process_query(message, llm=llm)

    search_topic = topic or detect_topic(message, min_keyword_count=1)
    search_date_from = date_from or query_info["date_from"]
    search_date_to = date_to or query_info["date_to"]
    search_query = query_info["clean_query"]
    search_intent = query_info["intent"]

    print(
        f"[RAG DEBUG] Query Understanding: topic={search_topic} "
        f"intent={search_intent}, "
        f"dates={search_date_from}→{search_date_to}, "
        f"clean_query='{search_query}'"
    )

    response_query_info = {
        "detected_topic": query_info["topic"],
        "filter_topic": search_topic,
        "date_range": [search_date_from, search_date_to],
        "clean_query": search_query,
        "intent": search_intent,
        "entities": query_info["entities"]
    }

    if include_debug:
        debug_info["query_understanding"] = {
            "query_info": query_info,
            "filter_topic": search_topic,
            "date_range": [search_date_from, search_date_to],
            "clean_query": search_query,
        }

    # ── Step 3: Hybrid search ─────────────────────────────────────────────────
    # Increase candidate count for summarization or complex searches
    k_candidates = 20 if search_intent == "Summarization" else 12

    hybrid_result = search_hybrid(
        query=search_query,
        k=k_candidates,
        topic=search_topic,
        date_from=search_date_from,
        date_to=search_date_to,
        include_debug=include_debug,
    )
    
    if include_debug:
        docs, hybrid_trace = hybrid_result
    else:
        docs = hybrid_result
        hybrid_trace = {}

    print(f"[RAG DEBUG] Hybrid search retrieved {len(docs)} documents:")
    for i, d in enumerate(docs[:5]):
        print(f"  Doc {i+1}: ID={d.get('id')} Title='{d.get('title')}' Score={d.get('score')} Date={str(d.get('publishedAt'))[:10]}")

    if not docs:
        if include_debug:
            debug_info["hybrid_search"] = {"docs_retrieved": 0, "docs": []}
        return RagChatResult(
            answer="Não encontrei notícias relevantes sobre esse assunto. Tente reformular a sua pergunta.",
            sources=[],
            query_info=response_query_info,
            new_turn=None,
            debug=debug_info,
        )

    if include_debug:
        debug_info["hybrid_search"] = {
            "docs_retrieved": len(docs),
            "trace": hybrid_trace,
            "docs": [{"id": d.get("id"), "title": d.get("title", ""), "score": d.get("score")} for d in docs]
        }

    # ── Step 4: Context assembly ──────────────────────────────────────────────
    context_str = assemble_context(docs)
    print(f"[RAG DEBUG] Assembled context: {len(context_str)} characters across {len(docs)} documents.")

    if include_debug:
        debug_info["context_assembly"] = {"context_str": context_str}

    # ── Step 5: History formatting ────────────────────────────────────────────
    if history:
        history_lines: list[str] = []
        for turn in history:
            history_lines.append(f"Utilizador: {turn['q']}")
            history_lines.append(f"Assistente: {turn['a']}")
        history_section = "Histórico da conversa:\n" + "\n".join(history_lines) + "\n\n"
    else:
        history_section = ""

    if include_debug:
        debug_info["history_formatting"] = {"history_section": history_section}

    rag_prompt = LLM_PROMPTS["RAG_QA"].format(
        context=context_str,
        question=message,
        history_section=history_section,
        intent=search_intent,
    )

    # ── Step 6: LLM generation ────────────────────────────────────────────────
    try:
        answer = llm._call(rag_prompt)
        print(f"[RAG DEBUG] Raw LLM Answer (Step 6):\n{answer}")
        print(f"[RAG DEBUG] Raw LLM Answer length: {len(answer)}")
        
        if include_debug:
            debug_info["llm_generation"] = {
                "rag_prompt": rag_prompt,
                "answer": answer
            }
            
        if "Erro ao comunicar com o modelo AMALIA:" in answer:
            return RagChatResult(
                answer="Desculpe, não consegui gerar uma resposta neste momento. Por favor, tente novamente.",
                sources=[],
                query_info=response_query_info,
                new_turn=None,
                debug=debug_info,
            )
            
        # ── Step 7: Response Evaluation and Rewrite ───────────────────────────────
        # Early-exit optimization: if no context was retrieved or context is empty, bypass evaluation and immediately return fallback
        if not docs or not context_str.strip():
            print("[RAG INFO] Context is empty. Bypassing evaluation and returning standard fallback.")
            answer = "Não disponho de dados suficientes nas notícias para responder a essa questão."
            docs = []
        else:
            eval_rewrite_prompt = LLM_PROMPTS["EVAL_REWRITE"].format(
                context=context_str,
                question=message,
                answer=answer
            )
            
            try:
                evaluated_answer = llm._call(eval_rewrite_prompt).strip()
                print(f"[RAG DEBUG] Evaluated LLM Answer (Step 7):\n{evaluated_answer}")
                
                # Check for standard fallback phrase or exact matches to clear sources if needed
                if "não disponho de dados suficientes" in evaluated_answer.lower():
                    print("[RAG DEBUG] Evaluator triggered fallback.")
                    answer = "Não disponho de dados suficientes nas notícias para responder a essa questão."
                    docs = []
                else:
                    answer = clean_evaluator_response(evaluated_answer)
                    print(f"[RAG DEBUG] Cleaned Evaluated Answer:\n{answer}")
                
                if include_debug:
                    debug_info["llm_generation"]["raw_answer"] = debug_info["llm_generation"].get("answer")
                    debug_info["llm_generation"]["answer"] = answer
                    debug_info["llm_generation"]["eval_rewrite_prompt"] = eval_rewrite_prompt
            except Exception as eval_e:
                print(f"[RAG WARNING] Response evaluation/rewrite failed: {eval_e}. Falling back to raw answer.")
                # Graceful fallback to raw answer checks if evaluation LLM call fails
                if "não disponho de dados suficientes" in answer.lower():
                    answer = "Não disponho de dados suficientes nas notícias para responder a essa questão."
                    docs = []
            
        print(f"[RAG DEBUG] LLM answer length: {len(answer)}")
    except Exception as e:
        print(f"[RAG ERROR] LLM call failed: {e}")
        if include_debug:
            debug_info["llm_generation"] = {
                "rag_prompt": rag_prompt,
                "error": str(e)
            }
        return RagChatResult(
            answer="Desculpe, não consegui gerar uma resposta neste momento. Por favor, tente novamente.",
            sources=[],
            query_info=response_query_info,
            new_turn=None,
            debug=debug_info,
        )

    return RagChatResult(
        answer=answer,
        sources=docs,
        query_info=response_query_info,
        new_turn=ChatTurn(q=message, a=answer),
        debug=debug_info,
    )
