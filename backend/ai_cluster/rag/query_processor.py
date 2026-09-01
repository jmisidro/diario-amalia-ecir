"""
Query Understanding Module (Steps 6, 7, 8)

Processes user queries before retrieval:
- Time-aware date extraction (Step 6): relative expressions + absolute Portuguese dates
- Topic detection from query text (Step 7)
- Query rewriting via LLM (Step 8) — DISABLED by default; the original query
  preserves keyword density for BM25 and avoids LLM paraphrase drift.

Changes from previous version
------------------------------
1. extract_date_range() now handles ABSOLUTE Portuguese date expressions
   ("dia 22 de março de 2026", "março de 2026", "em 2025", etc.) via regex
   and falls back to an LLM call (DATE_EXTRACT prompt) when regex yields nothing
   but the query contains year-like tokens.
2. process_query() no longer calls rewrite_query().  The original query is used
   for retrieval after temporal expressions are stripped.  The QUERY_REWRITE
   prompt is kept in constants for optional/experimental use.
"""

import re
import json
from calendar import monthrange
from datetime import datetime, timedelta, timezone, date as date_type
from typing import Optional

from .constants import TOPICS, LLM_PROMPTS, NODE_ENV


# ── Step 6: Time-Aware Query Parsing ──────────────────────────────────────────

# Portuguese month name → ISO month number
_PT_MONTHS: dict[str, int] = {
    "janeiro": 1,  "fevereiro": 2, "março": 3,    "marco": 3,
    "abril":   4,  "maio":      5, "junho":  6,   "julho":  7,
    "agosto":  8,  "setembro":  9, "outubro": 10, "novembro": 11,
    "dezembro": 12,
}

# Regex alternation of all month names (longest-first avoids partial matches)
_MONTH_ALT = "|".join(sorted(_PT_MONTHS.keys(), key=len, reverse=True))

# Relative temporal patterns (unchanged from original)
_TEMPORAL_PATTERNS = [
    (r"\bhoje\b",                             "fixed"),
    (r"\bontem\b",                            "fixed"),
    (r"\best[ae]\s+semana\b",                 "fixed"),
    (r"\bsemana\s+passada\b",                 "fixed"),
    (r"\best[ae]\s+m[eê]s\b",                 "fixed"),
    (r"\bm[eê]s\s+passado\b",                 "fixed"),
    (r"\b[uú]ltimos?\s+(\d+)\s+dias?\b",      "relative_days"),
    (r"\b[uú]ltimas?\s+(\d+)\s+semanas?\b",   "relative_weeks"),
]

# Absolute date patterns (tried in priority order)
_ABS_DAY_MONTH_YEAR = re.compile(
    rf"(?:dia\s+)?(\d{{1,2}})\s+de\s+({_MONTH_ALT})(?:\s+de\s+(\d{{4}}))?",
    re.IGNORECASE,
)
_ABS_MONTH_YEAR = re.compile(
    rf"(?:em\s+)?({_MONTH_ALT})\s+de\s+(\d{{4}})",
    re.IGNORECASE,
)
_ABS_MONTH_YEAR_BARE = re.compile(
    rf"\b({_MONTH_ALT})\s+(\d{{4}})\b",
    re.IGNORECASE,
)
_ABS_YEAR_ONLY = re.compile(r"\bem\s+(\d{4})\b|\bde\s+(\d{4})\b|\bano\s+de\s+(\d{4})\b")
# Used to decide whether an LLM fallback call is worth making
_HAS_YEAR_TOKEN = re.compile(r"\b(20\d{2}|19\d{2})\b")


def _make_month_range(year: int, month: int) -> tuple[str, str]:
    """Return (first_day, last_day) ISO strings for the given year/month."""
    first = date_type(year, month, 1)
    last  = date_type(year, month, monthrange(year, month)[1])
    return str(first), str(last)


def extract_date_range(query: str, llm=None) -> tuple[Optional[str], Optional[str]]:
    """
    Parse temporal references from a Portuguese query.

    Priority order:
      1. Relative expressions (hoje, ontem, esta semana, …)
      2. Specific day   — "dia 22 de março de 2026" / "22 de março"
      3. Month + year   — "março de 2026" / "em março de 2026"
      4. Bare month+year— "março 2026"
      5. Year only      — "em 2026" / "de 2026"
      6. LLM fallback   — DATE_EXTRACT prompt (only when year token present)

    Returns (date_from, date_to) as ISO date strings, or (None, None).
    """
    today = datetime.now(timezone.utc).date()
    q = query.lower()

    # ── 1. Relative patterns ──────────────────────────────────────────────────
    for pattern, handler in _TEMPORAL_PATTERNS:
        m = re.search(pattern, q)
        if not m:
            continue

        if handler == "fixed":
            grp = m.group()
            if "hoje" in grp:
                return str(today), str(today)
            elif "ontem" in grp:
                yesterday = today - timedelta(days=1)
                return str(yesterday), str(yesterday)
            elif "semana passada" in grp:
                start = today - timedelta(days=today.weekday() + 7)
                end   = today - timedelta(days=today.weekday() + 1)
                return str(start), str(end)
            elif re.search(r"est[ae]\s+semana", grp):
                start = today - timedelta(days=today.weekday())
                return str(start), str(today)
            elif "passado" in grp:  # mês passado
                first_this = today.replace(day=1)
                last_prev  = first_this - timedelta(days=1)
                first_prev = last_prev.replace(day=1)
                return str(first_prev), str(last_prev)
            elif re.search(r"est[ae]\s+m[eê]s", grp):
                return str(today.replace(day=1)), str(today)

        elif handler == "relative_days":
            n = int(m.group(1))
            return str(today - timedelta(days=n)), str(today)

        elif handler == "relative_weeks":
            n = int(m.group(1))
            return str(today - timedelta(weeks=n)), str(today)

    # ── 2. Specific day — "dia 22 de março de 2026" / "22 de março" ──────────
    m = _ABS_DAY_MONTH_YEAR.search(q)
    if m:
        day   = int(m.group(1))
        month = _PT_MONTHS.get(m.group(2).lower())
        year  = int(m.group(3)) if m.group(3) else today.year
        if month:
            try:
                d = date_type(year, month, day)
                return str(d), str(d)
            except ValueError:
                pass  # Invalid day for that month — fall through

    # ── 3. Month + year — "março de 2026" / "em março de 2026" ───────────────
    m = _ABS_MONTH_YEAR.search(q)
    if m:
        month = _PT_MONTHS.get(m.group(1).lower())
        year  = int(m.group(2))
        if month:
            try:
                return _make_month_range(year, month)
            except ValueError:
                pass

    # ── 4. Bare "MONTH YEAR" — "março 2026" ──────────────────────────────────
    m = _ABS_MONTH_YEAR_BARE.search(q)
    if m:
        month = _PT_MONTHS.get(m.group(1).lower())
        year  = int(m.group(2))
        if month:
            try:
                return _make_month_range(year, month)
            except ValueError:
                pass

    # ── 5. Year only — "em 2026" / "de 2026" / "ano de 2026" ─────────────────
    m = _ABS_YEAR_ONLY.search(q)
    if m:
        year_str = m.group(1) or m.group(2) or m.group(3)
        if year_str:
            year = int(year_str)
            return f"{year}-01-01", f"{year}-12-31"

    # ── 6. LLM fallback — only if query contains a year token ────────────────
    if llm and _HAS_YEAR_TOKEN.search(q):
        result = _extract_date_range_llm(query, llm, today)
        if result != (None, None):
            return result

    return None, None


def _extract_date_range_llm(query: str, llm, today: date_type) -> tuple[Optional[str], Optional[str]]:
    """
    Use the AMALIA LLM to extract a date range from the query.
    Falls back to (None, None) on any error or unparseable response.
    """
    prompt_template = LLM_PROMPTS.get("DATE_EXTRACT")
    if not prompt_template:
        return None, None

    prompt = prompt_template.format(query=query, today=str(today))
    try:
        raw = llm._call(prompt).strip()

        if NODE_ENV == "development":
            print(f"[QueryProcessor DATE_EXTRACT] Raw response: {repr(raw)}")

        # Strip markdown code fences if present
        raw = re.sub(r"```(?:json)?", "", raw).strip("`").strip()

        # Find the first JSON object in the response
        json_match = re.search(r'\{[^}]+\}', raw, re.DOTALL)
        if not json_match:
            return None, None

        data = json.loads(json_match.group())
        date_from = data.get("date_from")
        date_to   = data.get("date_to")

        # Validate that the values look like ISO dates
        iso_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        if date_from and not iso_re.match(str(date_from)):
            date_from = None
        if date_to and not iso_re.match(str(date_to)):
            date_to = None

        if NODE_ENV == "development":
            print(f"[QueryProcessor DATE_EXTRACT] Parsed: from={date_from}, to={date_to}")

        return date_from or None, date_to or None

    except Exception as e:
        print(f"[QueryProcessor] DATE_EXTRACT LLM fallback failed: {e}")
        return None, None


def strip_temporal_expressions(query: str) -> str:
    """
    Remove temporal expressions from the query so they don't dilute the
    embedding/BM25 signal.  Removes both relative patterns and the most
    common absolute date phrases.
    """
    q = query

    # Relative patterns
    for pattern, _ in _TEMPORAL_PATTERNS:
        q = re.sub(pattern, "", q, flags=re.IGNORECASE)

    # Absolute date phrases — strip "dia 22 de março de 2026" style strings
    q = re.sub(
        rf"(?:no\s+)?(?:dia\s+)?\d{{1,2}}\s+de\s+(?:{_MONTH_ALT})(?:\s+de\s+\d{{4}})?",
        "",
        q,
        flags=re.IGNORECASE,
    )
    # "em março de 2026" / "março de 2026" / "março 2026"
    q = re.sub(
        rf"(?:em\s+)?(?:{_MONTH_ALT})(?:\s+de\s+\d{{4}}|\s+\d{{4}})",
        "",
        q,
        flags=re.IGNORECASE,
    )
    # Bare "em 2026" / "de 2026" / "ano de 2026"
    q = re.sub(r"\b(?:em|de|no\s+ano\s+de)\s+\d{4}\b", "", q, flags=re.IGNORECASE)

    # Clean up extra whitespace / punctuation left behind
    q = re.sub(r"\s{2,}", " ", q)
    q = re.sub(r"\s+([?.!,])", r"\1", q)
    q = q.strip()

    # Safety: if everything was stripped, return original
    return q if q else query


# ── Step 7: Topic Extraction ──────────────────────────────────────────────────

# Keyword-to-topic mapping for Portuguese news queries
TOPIC_KEYWORDS: dict[str, list[str]] = {
    # NOTE: "habitação" is under Política (housing policy is a major political topic in PT)
    "Política":       ["governo", "ministro", "parlamento", "eleições", "eleicoes", "partido",
                       "lei", "decreto", "assembleia", "deputado", "primeiro-ministro",
                       "presidente", "autárquicas", "autarquicas", "oposição", "coligação",
                       "habitação", "habitacao", "renda", "arrendamento"],
    "Economia":       ["economia", "pib", "inflação", "banco", "empresas", "mercado", "emprego",
                       "desemprego", "salário", "orçamento", "orcamento", "impostos", "iva",
                       "dívida", "exportações", "importações", "recessão"],
    "Internacional":  ["guerra", "ucrânia", "ucrania", "europa", "eua", "estados unidos",
                       "nato", "onu", "rússia", "china", "médio oriente", "israel",
                       "palestina", "diplomacia", "tratado", "sanções"],
    "Saúde":          ["saúde", "saude", "hospital", "doença", "doenca", "vacina", "sns",
                       "médico", "medico", "enfermeiro", "pandemia", "covid", "urgência",
                       "farmácia", "medicamento"],
    "Ciência":        ["investigação", "investigacao", "ciência", "ciencia", "estudo",
                       "universidade", "descoberta", "laboratório", "pesquisa", "cientista"],
    "Tecnologia":     ["tecnologia", "ia", "inteligência artificial", "digital", "software",
                       "startup", "aplicação", "cibersegurança", "dados", "internet", "5g"],
    "Cultura":        ["cinema", "museu", "livro", "arte", "festival", "teatro", "música",
                       "exposição", "óscar", "prémio", "literatura", "concerto"],
    "Ambiente":       ["clima", "ambiente", "temperatura", "sustentabilidade", "incêndio",
                       "incendio", "seca", "inundação", "poluição", "emissões", "carbono",
                       "energia renovável", "reciclagem"],
    # NOTE: "desporto" added as the generic term for the category
    "Desporto":       ["desporto", "futebol", "sporting", "benfica", "porto", "jogos", "atleta",
                       "campeonato", "liga", "seleção", "selecao", "treinador", "golo", "jogo",
                       "olímpico", "olimpico", "maratona", "mundial", "clássico", "classico"],
    "Sociedade":      ["crianças", "família", "pobreza", "imigração", "imigracao",
                       "violência", "doméstica", "educação",
                       "escola", "justiça", "tribunal", "crime", "segurança"],
    "Local":          ["município", "municipio", "câmara", "autarquia", "bairro",
                       "freguesia", "local", "regional", "vereador"],
}


def detect_topic(query: str, min_keyword_count: int = 1) -> Optional[str]:
    """
    Detect the most likely news topic from the query using keyword matching.
    Returns the topic name (matching constants.TOPICS) or None.

    min_keyword_count=1 for informational detection (query_info).
    Callers that use the topic as a HARD FILTER should pass min_keyword_count=2
    to avoid false positives from single ambiguous words.
    """
    q = query.lower()
    best_topic = None
    best_count = 0

    for topic, keywords in TOPIC_KEYWORDS.items():
        count = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', q))
        if count > best_count:
            best_topic = topic
            best_count = count

    return best_topic if best_count >= min_keyword_count else None


# ── Step 8: Query Rewriting via LLM ──────────────────────────────────────────
# NOTE: rewrite_query() is kept here for experimental use but is no longer
# called by process_query().  Live testing showed that LLM rewrites tend to
# produce verbose question-style strings that hurt BM25 term frequency without
# improving semantic recall.  The original (temporal-stripped) query is used
# instead.

def rewrite_query(query: str, llm) -> str:
    """
    Use the AMALIA LLM to rewrite the query for better retrieval.
    Expands abbreviations, removes temporal markers, and normalises phrasing.
    Falls back to the original query on any error.

    NOT called by default — available for experimental/A-B testing.
    """
    prompt_template = LLM_PROMPTS.get("QUERY_REWRITE")
    if not prompt_template:
        return query

    prompt = prompt_template.format(query=query)
    try:
        rewritten = llm._call(prompt)
        rewritten = rewritten.strip()
        # Basic sanity check: rewritten should not be empty or way too long
        if rewritten and len(rewritten) < len(query) * 3:
            return rewritten
        return query
    except Exception as e:
        print(f"[QueryProcessor] Rewrite failed (using original): {e}")
        return query


def analyze_query_llm(query: str, llm) -> dict:
    """
    Use the AMALIA LLM to perform intent classification.
    Returns a dict with intent, entities, search_terms, sub_queries.
    """
    prompt_template = LLM_PROMPTS.get("QUERY_ANALYSIS")
    if not prompt_template:
        return {}

    analysis = {
        "intent": "Informational",
        "entities": [],
        "search_terms": [],
        "sub_queries": []
    }

    prompt = prompt_template.format(query=query)
    try:
        response = llm._call(prompt).strip()

        if NODE_ENV == "development":
            print(f"[AmaliaLLM Query Analysis DEBUG] Raw Response: '{response}' for prompt: '{prompt}'")

        valid_intents = ["Informational", "Summarization", "TemporalComparison", "AggregatedSearch", "GeneralChat"]
        for vi in valid_intents:
            if vi.lower() in response.lower():
                analysis["intent"] = vi
                break

        return analysis
    except Exception as e:
        print(f"[QueryProcessor] Analysis failed: {e}")
        return analysis


# ── Combined Query Processing ────────────────────────────────────────────────

def process_query(query: str, llm=None) -> dict:
    """
    Full query understanding pipeline.
    Returns a dict with: clean_query, topic, date_from, date_to, original_query,
    and structural metadata (intent, entities, etc).

    Pipeline (all steps):
      6a. Absolute + relative date extraction (regex, then LLM fallback)
      7.  Topic detection (fast keyword heuristic)
      8.  Intent classification (LLM)
      -   Query rewriting is intentionally SKIPPED: the temporal-stripped
          original query preserves keyword density better than an LLM paraphrase.
    """
    # 6. Extract temporal info
    # Pass llm for LLM fallback when year token is present but regex misses it
    date_from, date_to = extract_date_range(query, llm=llm)

    # 7. Detect topic (fast heuristic)
    topic = detect_topic(query)

    # Strip temporal expressions so they don't skew embeddings/BM25
    query_no_time = strip_temporal_expressions(query)
    # Use the cleaned query directly — no LLM rewrite applied
    clean_query = query_no_time

    # 8. Structural analysis (intent + entities)
    analysis = {
        "intent": "Informational",
        "entities": [],
        "search_terms": [],
        "sub_queries": []
    }

    if llm:
        if "QUERY_ANALYSIS" in LLM_PROMPTS:
            analysis = analyze_query_llm(query, llm)
        # NOTE: rewrite_query() deliberately not called here.

    return {
        "original_query": query,
        "clean_query":    clean_query,
        "topic":          topic,
        "date_from":      date_from,
        "date_to":        date_to,
        "intent":         analysis.get("intent", "Informational"),
        "entities":       analysis.get("entities", []),
        "search_terms":   analysis.get("search_terms", []),
        "sub_queries":    analysis.get("sub_queries", []),
    }
