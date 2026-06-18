# Alfabra Vector — Claude Code Context

## Projeto

Plataforma corporativa de RAG (Retrieval-Augmented Generation) para busca semântica em documentos privados, com orquestração de agentes de IA. Monorepo multi-linguagem com Docker Compose.

## Arquitetura

| Diretório | Stack | Responsabilidade |
|-----------|-------|------------------|
| `frontend/` | Next.js 14, React, Tailwind | UI web |
| `java-core/` | Java 17, Spring Boot 3, Flyway | Core API REST, RBAC, JWT, metadados |
| `rust-services/ingestion-worker/` | Rust, Tokio | Ingestão de documentos, polling PostgreSQL |
| `rust-services/embedding-service/` | Rust, Axum | Geração de embeddings via Vertex AI/Gemini |
| `rust-services/rag-worker/` | Rust | Busca vetorial pgvector, resposta RAG |
| `rust-services/document-processing/` | Rust | Extração de texto de documentos |
| `rust-services/workflow-worker/` | Rust | Orquestração de fluxos |
| `python-services/crew-worker/` | Python, CrewAI | Agentes autônomos LLM |

**Infra:** PostgreSQL + pgvector, Redis, MinIO (S3), RabbitMQ, Caddy (proxy/TLS)

## Reversa Framework

O projeto usa o **Reversa** (`reversa@^1.2.43` em `package.json`) como framework de engenharia e skills de IA.

- **Skills disponíveis:** `.agents/skills/reversa-*/SKILL.md` (~50 skills)
- **Documentação gerada:** `_reversa_sdd/` (architecture, domain, ERD, ADRs, etc.)
- **Features em andamento:** `_reversa_forward/NNN-nome/` (actions.md, requirements.md, progress.jsonl)
- **Ativar:** digitar `reversa` sozinho carrega `.agents/skills/reversa/SKILL.md`

**Regra não-negociável:** nunca apagar, modificar ou sobrescrever arquivos pré-existentes do projeto. O Reversa escreve **apenas** em `.reversa/` e `_reversa_sdd/`.

## Documentação chave

- `_reversa_sdd/architecture.md` — visão arquitetural completa
- `_reversa_sdd/domain.md` — domínio e entidades
- `_reversa_sdd/dependencies.md` — mapa de dependências
- `_reversa_sdd/gaps.md` — dívidas técnicas e gaps
- `AGENTS.md` — instruções do Reversa para agentes

## Comandos comuns

```bash
# Subir toda a stack
docker-compose up -d

# Desenvolvimento local
./scripts/dev.sh

# Java Core
cd java-core && ./gradlew bootRun
cd java-core && ./gradlew test

# Rust (todos os serviços)
cd rust-services && cargo build
cd rust-services && cargo test

# Frontend
cd frontend && npm run dev
cd frontend && npm run build

# E2E
npm run test:e2e

# Logs / Reset
./scripts/logs.sh
./scripts/reset.sh
```

## Convenções

- Comunicação Java → Rust: polling PostgreSQL (ingestion) e HTTP REST interno (porta 8000)
- Auth: JWT stateless via header HTTP
- Embeddings: Vertex AI / Gemini (sem fallback atual — dívida técnica)
- Migrações de banco: Flyway (em `java-core/src/main/resources/db/migration/`)
