import os
from dotenv import load_dotenv

# Ported from JS constants
load_dotenv()

API_ENDPOINT = os.getenv("API_ENDPOINT")
AMALIA_VERSION = os.getenv("AMALIA_VERSION")

OPENSEARCH_URL = os.getenv("OPENSEARCH_NODE", "http://opensearch_diario:9200")
OPENSEARCH_PASSWORD = os.getenv("OPENSEARCH_PASSWORD", "")
INDEX_NAME = "diario_do_amalia_news"

NODE_ENV = os.getenv("NODE_ENV", "development")

# ── Embedding Model ──────────────────────────────────────────────────────────
# Dev default: MiniLM (384 dim, lightweight, multilingual)
# Production: BAAI/bge-m3 (1024 dim) — set via EMBEDDING_MODEL_NAME env var
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "384"))

# ── Reranker Model (Step 3) ──────────────────────────────────────────────────
# Dev default: cross-encoder/mmarco-mMiniLMv2-L12-H384-v1 (CPU-friendly, ~130MB)
# Production: BAAI/bge-reranker-v2-m3 (GPU-optimized, ~1.3GB) — set via RERANKER_MODEL_NAME env var
RERANKER_MODEL_NAME = os.getenv("RERANKER_MODEL_NAME", "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")

# ── Retrieval Pipeline Tuning ────────────────────────────────────────────────
# RRF k constant — controls how fast rank contribution decays (Step 1)
RRF_K_CONSTANT = int(os.getenv("RRF_K_CONSTANT", "60"))

# Number of candidates retrieved from each source before fusion/reranking
CANDIDATE_K = int(os.getenv("CANDIDATE_K", "20"))

# Number of documents passed to the LLM after reranking
FINAL_TOP_N = int(os.getenv("FINAL_TOP_N", "6"))

# Recency decay λ — higher = more aggressive decay of older articles (Step 4)
# λ=0.05 → article loses ~5% score per day, ~30% in a week
RECENCY_LAMBDA = float(os.getenv("RECENCY_LAMBDA", "0.05"))

# Deduplication cosine similarity threshold (Step 5)
# Documents with sim ≥ threshold are considered near-duplicates
DEDUP_THRESHOLD = float(os.getenv("DEDUP_THRESHOLD", "0.85"))

# ── Context Assembly (Steps 9, 10) ───────────────────────────────────────────
# Maximum character count for assembled context before sending to LLM
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "6000"))

# Maximum number of conversation turns to keep in history (Step 11)
MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "3"))

# ── Topics ────────────────────────────────────────────────────────────────────
TOPICS = [
    'Política', 'Economia', 'Internacional', 'Saúde', 'Ciência',
    'Tecnologia', 'Cultura', 'Ambiente', 'Desporto', 'Sociedade', 'Local'
]

# ── LLM Prompts ──────────────────────────────────────────────────────────────
LLM_PROMPTS = {
    # RAG prompt with labelled context and citation instructions
    "RAG_QA": """És o assistente do Diário do AMALIA. A tua função é responder a perguntas de utilizadores com base EXCLUSIVAMENTE nas notícias de contexto fornecidos abaixo.

REGRAS ABSOLUTAS:
1. Usa APENAS informação presente nas notícias. Nunca inventes factos.
2. Se a resposta não constar das notícias, responde: "Não disponho de dados suficientes nas notícias para responder a essa questão."
3. TODAS as afirmações devem terminar com a citação no formato exato: (Fonte: [N]) — onde N é o número da notícia entre parênteses retos.
4. Nunca uses o título da notícia como citação. Apenas o número: (Fonte: [1]), (Fonte: [2]), etc.
5. Se uma frase combina informação de várias notícias, lista todas: (Fonte: [1][3]).
6. Sintetiza informação de várias notícias quando relevante, em vez de as repetir individualmente.

EXEMPLO OBRIGATÓRIO DE FORMATO:
Pergunta: "O que aconteceu?"
Resposta correta: "O governo anunciou novas medidas fiscais. (Fonte: [2]) Em resposta, a oposição convocou uma manifestação para o fim de semana. (Fonte: [1][3])"
Resposta errada: "O governo anunciou novas medidas fiscais. (Fonte: Público)" ← título proibido

Intenção do utilizador detetada: {intent}
Por favor, adapta o teu estilo de resposta a esta intenção (ex: resumos detalhados para Summarization, respostas factuais e objetivas para Informational, destaca diferenças para TemporalComparison).

{history_section}NOTÍCIAS DE CONTEXTO:
{context}

PERGUNTA:
{question}

RESPOSTA (em Português Europeu):""",

    # Query rewriting prompt (kept for optional use but not applied by default)
    "QUERY_REWRITE": """Reformula a seguinte questão para melhorar a pesquisa em notícias portuguesas.
REGRAS ESTRITAS:
- Mantém o significado e tema EXATOS da questão original. NÃO acrescentes entidades, países ou temas não mencionados.
- Expande apenas abreviações inequívocas (OE→Orçamento do Estado, AR→Assembleia da República, PM→Primeiro-Ministro).
- Remove linguagem conversacional desnecessária (e.g. "preciso de saber", "podes dizer-me").
- Retorna APENAS a questão reformulada, sem comentários ou explicações.

Questão original: {query}
Questão reformulada:""",

    # Structured Query Analysis
    "QUERY_ANALYSIS": """Analisa a seguinte questão sobre notícias portuguesas e classifica a sua intenção de pesquisa.
Retorna APENAS UMA PALAVRA correspondente à intenção da lista abaixo:
- Informational (pesquisa de factos ou estado atual)
- Summarization (pedido de um resumo estruturado)
- TemporalComparison (pedido de evolução ao longo do tempo ou comparação)
- AggregatedSearch (pedido que envolve várias entidades não relacionadas)
- GeneralChat (conversa genérica)

Questão: {query}
Intenção:""",

    # Structured date extraction from a Portuguese query (LLM fallback in query_processor)
    "DATE_EXTRACT": """Analisa a seguinte questão em português e extrai o intervalo de datas mencionado.

REGRAS ESTRITAS:
- Se a questão mencionar uma data específica (ex: "22 de março de 2026", "no dia 5 de abril"), retorna essa data em date_from e date_to.
- Se mencionar apenas mês e ano (ex: "março de 2026", "em fevereiro de 2025"), retorna o primeiro e último dia desse mês.
- Se mencionar apenas um ano (ex: "em 2025"), retorna "2025-01-01" e "2025-12-31".
- Se mencionar referências relativas como "ontem", "esta semana", "semana passada", "este mês", "mês passado", usa a data de hoje ({today}) para calcular o intervalo.
- Se não houver NENHUMA referência temporal na questão, retorna null para ambos os campos.
- Retorna APENAS um objeto JSON válido com os campos date_from e date_to no formato YYYY-MM-DD (ou null). Sem texto adicional, sem explicações, sem markdown.

Exemplos:
Questão: "O que aconteceu no dia 22 de março de 2026?"
{{"date_from": "2026-03-22", "date_to": "2026-03-22"}}

Questão: "O que aconteceu em março de 2026?"
{{"date_from": "2026-03-01", "date_to": "2026-03-31"}}

Questão: "Quem ganhou a liga em 2025?"
{{"date_from": "2025-01-01", "date_to": "2025-12-31"}}

Questão: "O que aconteceu hoje?"
{{"date_from": "{today}", "date_to": "{today}"}}

Questão: "Quem é o presidente de Portugal?"
{{"date_from": null, "date_to": null}}

Questão: {query}
""",

    # Response verification and rewriting prompt (Step 7)
    "EVAL_REWRITE": """És um editor de notícias do Diário do AMALIA. Deves rever a resposta gerada e garantir que ela cumpre estritamente as regras de factos e citações baseadas nas notícias de contexto.

[NOTÍCIAS DE CONTEXTO]
{context}

[PERGUNTA DO UTILIZADOR]
{question}

[RESPOSTA GERADA A REVER]
{answer}

[REGRAS DE REVISÃO]
1. Se a resposta gerada for a frase padrão de falta de dados ("Não disponho de dados suficientes nas notícias para responder a essa questão."), mantém-na exatamente como está.
2. Se a resposta gerada contiver afirmações, garante que todas elas são suportadas pelas NOTÍCIAS DE CONTEXTO. Remove qualquer afirmação ou detalhe que não esteja presente nas notícias de contexto.
3. Corrige todas as fontes/citações na resposta gerada para o formato exato "(Fonte: [N])", onde N é o número correspondente da notícia no contexto (ex: [1], [2]). Nunca uses títulos ou datas nas citações.
4. Nunca alteres uma resposta correta para a frase de falta de dados se os factos estiverem presentes no contexto.
5. Não acrescentes comentários, explicações ou notas. Produz apenas o texto final da resposta.

[RESPOSTA FINAL REVISTA]"""
}
