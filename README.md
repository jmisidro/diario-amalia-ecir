<div align="center">
  <img src="./frontend/public/AMALIA-logos/symbol/symbol-yellow.png" alt="AMALIA Symbol" height="55" valign="middle" />
  &nbsp;&nbsp;
  <img src="./frontend/public/AMALIA-logos/wordmark/workmark-black.png#gh-light-mode-only" alt="AMALIA Wordmark" height="38" valign="middle" />
  <img src="./frontend/public/AMALIA-logos/wordmark/workmark-white.png#gh-dark-mode-only" alt="AMALIA Wordmark" height="38" valign="middle" />
</div>

# Diário do AMALIA: Semantic Aggregation and Conversational Search for European Portuguese News


[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg?logo=python&logoColor=white)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18+-green.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-blue.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Express](https://img.shields.io/badge/Backend-Express.js-black.svg?logo=express&logoColor=white)](https://expressjs.com/)
[![FastAPI](https://img.shields.io/badge/AI%20Engine-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-black.svg?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/UI-React%2019-61DAFB.svg?logo=react&logoColor=white)](https://react.dev/)
[![OpenSearch](https://img.shields.io/badge/Vector%20%26%20Search-OpenSearch-005EB8.svg?logo=opensearch&logoColor=white)](https://opensearch.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![LLM: AMALIA](https://img.shields.io/badge/LLM-AMALIA%20(9B)-8A2BE2.svg?logoColor=white)](https://amaliallm.pt/)


Official repository for the ECIR 2027 demo paper: **"Diário do AMALIA: Semantic Aggregation and Conversational Search for European Portuguese News"**.

This repository contains the full source code, news ingestion pipelines, AI clustering services, hybrid RAG engine, and step-by-step instructions to run the **Diário do AMALIA** platform locally.

> **Try the Live Demo**: [https://diario.amalia.inesctec.pt](https://diario.amalia.inesctec.pt)


## Overview

**Diário do AMALIA** demonstrates how modern Natural Language Processing (NLP), Information Retrieval (IR), and sovereign Large Language Models can transform fragmented daily journalism into an accessible, aggregated, and verifiable conversational news experience tailored for European Portuguese.

- **The Problem:** Citizens are inundated with hundreds of news articles daily across competing outlets. General-purpose LLMs struggle with up-to-the-minute news, frequently hallucinate facts, lack cultural and linguistic alignment with European Portuguese (PT-PT), and fail to cite verifiable news sources.
- **Our Solution:** Diário do AMALIA continuously ingests RSS feeds from major Portuguese news outlets every 15 minutes, clusters related stories via agglomerative clustering, generates daily and weekly briefings using the sovereign **AMALIA LLM** (9B parameter model optimized for PT-PT), indexes all content into **OpenSearch**, and provides an interactive conversational assistant powered by a multi-stage **Hybrid Retrieval-Augmented Generation (RAG)** pipeline with guardrails, cross-encoder reranking, and self-verification.
- **Demonstration Scope:** Aggregates coverage from premier national news providers (Público, Jornal de Notícias, Diário de Notícias, Expresso, Observador, RTP, SIC Notícias, etc.) organized across 11 topical domains (Política, Economia, Sociedade, Internacional, Ciência, Tecnologia, Cultura, Desporto, Saúde, Ambiente, and Local).
- **Project Status:** Under active development and deployed with a functional online demo.


## Live Demo

**Access the platform**: [https://diario.amalia.inesctec.pt](https://diario.amalia.inesctec.pt)

The live demonstration showcases all system capabilities:
- **Interactive RAG News Assistant**: Context-grounded dialogue with strict inline citations `(Fonte: [N])` and automated fact-checking rewrites.
- **Daily & Weekly Topic Briefings**: Multi-document summarization clustered by thematic salience.
- **Hybrid Lexical & Semantic Search**: OpenSearch-powered search combining BM25 keyword matching and dense vector embeddings (`bge-m3`).
- **Temporal & Category Faceting**: Filtering by date range and 11 distinct editorial categories.
- **Multi-Session Management**: Concurrent multi-turn conversation sessions with persistent context memory.
- **Source Provenance**: Direct linking to original publisher articles for transparency and attribution.


## Architecture

The Diário do AMALIA platform consists of three core components coordinated via Docker Compose:

```
                               ┌────────────────────────┐
                               │   Next.js Frontend     │
                               │  (React 19 / Tailwind) │
                               └───────────┬────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
        ┌───────────────────────┐                     ┌───────────────────────┐
        │  Node.js Backend API  │                     │   Python AI Cluster   │
        │   (Ingestion & Cron)  │                     │     (FastAPI RAG)     │
        └───────────┬───────────┘                     └───────────┬───────────┘
                    │                                             │
         ┌──────────┴──────────┐                       ┌──────────┴──────────┐
         ▼                     ▼                       ▼                     ▼
  ┌─────────────┐       ┌─────────────┐         ┌─────────────┐       ┌─────────────┐
  │   MongoDB   │       │ AMALIA LLM  │         │ OpenSearch  │       │    NeMo     │
  │  (Storage)  │       │    API      │         │ (kNN+BM25)  │       │ Guardrails  │
  └─────────────┘       └─────────────┘         └─────────────┘       └─────────────┘
```

### 1. Frontend (`/frontend`)
- Built with **Next.js 16** (App Router), **React 19**, **TailwindCSS**, and **Radix UI** primitives.
- Provides a dynamic dashboard for news discovery, category filtering, temporal navigation, and an interactive conversational chat interface with citations and source transparency.

### 2. Node.js Backend & Ingestion Engine (`/backend`)
- Built with **Node.js**, **Express**, and **MongoDB**.
- **Automated Ingestion Pipeline**: A scheduled 11-phase workflow runs periodically (every 15 minutes) to:
  1. Parse RSS feeds across Portuguese media outlets.
  2. Perform agglomerative clustering on news titles and embeddings.
  3. Snapshot daily subjects and aggregate weekly themes.
  4. Archive stale news and entities.
  5. Orchestrate calls to the AMALIA LLM to generate daily and weekly thematic summaries.
  6. Bridge processed summaries into OpenSearch via the AI Cluster.

### 3. AI Cluster & Hybrid RAG Engine (`/backend/ai_cluster`)
- Built with **Python 3.10+**, **FastAPI**, **SentenceTransformers**, **PyTorch**, **OpenSearch**, and **NeMo Guardrails**.
- High-performance microservice providing vector embeddings, agglomerative clustering, hybrid search, and the full multi-stage conversational RAG pipeline.


## RAG Pipeline Walkthrough

The conversational engine uses a multi-stage retrieval and validation pipeline:

1. **Pre-Retrieval Guardrails**: **NeMo Guardrails** evaluates the user input to block adversarial prompts, toxic language, and out-of-domain queries early.
2. **Query Understanding & Intent Extraction**: Classifies query intent (*Informational, Summarization, TemporalComparison, AggregatedSearch, GeneralChat*), infers topical filters, and resolves relative date mentions (e.g., "ontem", "esta semana", "em 2026") into ISO date ranges.
3. **Parallel Hybrid Retrieval**: Executes concurrent dense vector search (kNN with cosine similarity using `BAAI/bge-m3` embeddings) and lexical search (BM25) on OpenSearch with pre-filtering on topics and publication dates.
4. **Reciprocal Rank Fusion (RRF)**: Combines dense vector and BM25 ranked candidate lists ($k=60$) to balance semantic similarity and exact keyword matching without score scale distortion.
5. **Exponential Recency Decay**: Multiplies candidate scores by $\exp(-\lambda \times \text{age\_in\_days})$ (default $\lambda=0.05$) to prioritize fresh reporting, automatically bypassed when explicit historical dates are queried.
6. **Semantic Deduplication**: Computes pairwise cosine similarity on candidate vectors; near-duplicates ($\ge 0.85$) across syndicated press agencies are pruned.
7. **Cross-Encoder Reranking**: Applies a multilingual cross-encoder model (`cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` or `bge-reranker-v2-m3`) to re-score query-document pairs, selecting the final top $N$ most relevant articles.
8. **Context Assembly & Budgeting**: Formats articles with unique identifiers (`[1]`, `[2]`), enforcing a maximum character budget to respect LLM context constraints.
9. **Multi-Turn History Integration**: Incorporates the preceding dialogue turns for seamless follow-up questions.
10. **LLM Generation & Fact-Verification**: Generates a Portuguese response using the sovereign **AMALIA LLM** strictly referencing `(Fonte: [N])`, followed by an `EVAL_REWRITE` verification pass to enforce citation integrity and eradicate hallucinations.


## Technology Stack

- **Languages**: Python 3.10+, TypeScript, JavaScript
- **Frontend**: Next.js 16, React 19, TailwindCSS, Radix UI, Lucide Icons
- **Backend**: Node.js, Express, MongoDB, node-cron, rss-parser
- **AI / NLP Microservice**: FastAPI, Uvicorn, SentenceTransformers, PyTorch, Scikit-learn
- **Retrieval & Storage**: OpenSearch (kNN vector indexing + BM25), MongoDB
- **Guardrails & Safety**: NeMo Guardrails
- **Models**:
  - **Generation & Summarization**: AMALIA LLM (9B parameters, PT-PT optimized)
  - **Dense Embeddings**: `BAAI/bge-m3` (1024-dim) / `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384-dim)
  - **Reranker**: `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` / `BAAI/bge-reranker-v2-m3`
- **Infrastructure**: Docker, Docker Compose


## Running the Demo Locally

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)
- Git for cloning the repository

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/inesctec/diario-amalia-ecir.git
cd diario-amalia-ecir

# 2. Configure environment variables
cp .env.example .env

# 3. Start all platform services
docker compose up --build -d
```

### Access Points

Once all containers are running and healthy:
- **Web Platform**: [http://localhost:3001](http://localhost:3001)
- **Node.js API**: [http://localhost:8081](http://localhost:8081)
- **AI Cluster / RAG API Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **OpenSearch Cluster**: [http://localhost:9200](http://localhost:9200)
- **MongoDB**: `localhost:27018`

### Development Mode (with Hot Reloading)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Stopping the Demo

```bash
# Stop containers
docker compose down

# Stop containers and delete persistent volumes
docker compose down -v
```


## Environment Configuration

Configure the platform by editing the `.env` file created from `.env.example`:

| Variable | Default / Example | Description |
| :--- | :--- | :--- |
| `API_PORT` | `8081` | Port for the Express backend server |
| `API_URL` | `http://backend_diario:8081` | Internal URL for backend API communication |
| `CLUSTER_API_URL` | `http://python_api_diario:8001` | URL for the Python AI Cluster microservice |
| `OPENSEARCH_NODE` | `http://opensearch_diario:9200` | OpenSearch endpoint |
| `MONGO_ROOT_USER` | `admin` | MongoDB root username |
| `MONGO_ROOT_PASSWORD` | *(secret)* | MongoDB root password |
| `API_ENDPOINT` | *(custom)* | AMALIA LLM inference endpoint |
| `AMALIA_VERSION` | *(version)* | AMALIA LLM deployment tag / model version |
| `EMBEDDING_MODEL_NAME` | `BAAI/bge-m3` | SentenceTransformers embedding model |
| `EMBEDDING_DIMENSION` | `1024` | Embedding vector dimensionality |
| `RERANKER_MODEL_NAME` | `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` | Cross-encoder model for candidate reranking |
| `RRF_K_CONSTANT` | `60` | Reciprocal Rank Fusion decay constant |
| `RECENCY_LAMBDA` | `0.05` | Exponential time-decay factor for news freshness |
| `DEDUP_THRESHOLD` | `0.85` | Cosine similarity threshold for semantic deduplication |
| `MAX_CONTEXT_CHARS` | `6000` | Maximum character budget sent to LLM prompt context |
| `MAX_HISTORY_TURNS` | `3` | Number of previous dialogue turns preserved in chat |


## Project Structure

```
diario-amalia-ecir/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── amalia/            # AMALIA LLM prompt templates and API connectors
│   │   ├── controllers/       # Route handlers (news, summaries, themes, chat)
│   │   ├── models/            # MongoDB data models
│   │   ├── routes/            # Express user and system API routes
│   │   ├── services/          # RSS feed parser, clustering, and cron tasks
│   │   ├── db.js              # Database connection and queries
│   │   └── server.js          # Express app entrypoint and cron scheduler
│   └── ai_cluster/            # Python AI microservice
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── app.py             # FastAPI app and endpoint routing
│       └── rag/               # RAG architecture
│           ├── constants.py   # RAG hyperparameters and prompt templates
│           ├── llm.py         # AMALIA LLM provider interface
│           ├── pipeline.py    # OpenSearch hybrid search, kNN, RRF, reranking
│           ├── query_processor.py # Intent classification and date parsing
│           ├── rag.py         # End-to-end chat turn orchestrator
│           └── config/        # NeMo Guardrails configuration files
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── app/                   # Next.js App Router (pages and layouts)
│   │   ├── chat/              # Conversational RAG assistant interface
│   │   ├── noticias/          # Daily and historical news archive
│   │   ├── sobre/             # About page and project mission
│   │   └── page.tsx           # Homepage and curated briefing dashboard
│   ├── components/            # Reusable UI components (Radix + Tailwind)
│   └── public/                # Static assets, logos, and agency branding
│
├── docker-compose.yml         # Production service definitions
├── docker-compose.dev.yml     # Development hot-reload service overrides
├── .env.example               # Template environment configuration
└── README.md                  # Project documentation
```


## License

This project is licensed under the AGPLv3 dual licence. See the [LICENSE](LICENSE) file for details.


## Acknowledgements

### Development

The Diário do AMALIA platform was developed by the [NLP&IR](https://nlp.inesctec.pt) team at [INESC TEC](https://www.inesctec.pt) (Institute for Systems and Computer Engineering, Technology and Science).

### Affiliations

- [University of Porto (UP)](https://www.up.pt/)
- [University of Beira Interior (UBI)](https://www.ubi.pt/)
- [Portuguese Foundation for Science and Technology (FCT)](https://www.fct.pt/)
- [AMALIA LLM Project](https://amaliallm.pt/)

### Data Providers

We gratefully acknowledge the Portuguese news agencies and media publishers (including *Público, Jornal de Notícias, Diário de Notícias, Expresso, Observador, RTP, SIC Notícias*, and others) whose public RSS feeds enable research in automated summarization, civic transparency, and information retrieval.

### Funding

This work was funded within the scope of the **AMALIA Project**, supported by the Recovery and Resilience Plan (PRR) within the scope of the Recovery and Resilience Mechanism (MRR) of the European Union (NextGenerationEU), and the FCT - Fundação para a Ciência e a Tecnologia, I.P.


## Additional Resources

- **Diário do AMALIA Platform**: [https://diario.amalia.inesctec.pt](https://diario.amalia.inesctec.pt)
- **AMALIA LLM Initiative**: [https://amaliallm.pt](https://amaliallm.pt)
- **INESC TEC NLP Team**: [https://nlp.inesctec.pt](https://nlp.inesctec.pt)


## Contact

For questions, support, or collaboration inquiries:

**Email**: `jose.m.isidro@inesctec.pt`

