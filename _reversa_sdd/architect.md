# Arquitetura do Sistema — Alfabra-Vector

> Gerado pelo Reversa em 2026-06-19
> Nível: Essencial | Idioma: Português

---

## 1. Diagrama C4 — Nível 1: Contexto do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ALFABRA-VECTOR PLATFORM                         │
│              Plataforma Corporativa de RAG e Agentes de IA              │
└─────────────────────────────────────────────────────────────────────────┘

  Atores externos:                      Sistemas externos:

  ┌──────────────┐                      ┌───────────────────────────┐
  │  Colaborador │ ── usa ──────────►  │   Vertex AI / Gemini API  │
  │  (Usuário)   │                      │   (Google Cloud Platform)  │
  └──────────────┘                      └───────────────────────────┘
                                                    ▲
  ┌──────────────┐                                  │ chama
  │Administrador │ ── gerencia ────►  ┌─────────────────────────────┐
  │  (Usuário)   │                    │     ALFABRA-VECTOR           │
  └──────────────┘                    │  (sistema delimitado acima)  │
                                      └─────────────────────────────┘
                                                    │
                                         ┌──────────┴──────────┐
                                         │      DuckDNS         │
                                         │  (resolução DNS /    │
                                         │   certificado TLS)   │
                                         └─────────────────────┘
```

**Descrição:** Colaboradores e administradores da empresa interagem com a plataforma via navegador web. O sistema usa o Vertex AI (GCP) para geração de embeddings e respostas LLM. DuckDNS provê resolução DNS dinâmica e permite que o Caddy obtenha certificados TLS automaticamente.

---

## 2. Diagrama C4 — Nível 2: Containers

```
┌─────────────────────────────────── ALFABRA-VECTOR ────────────────────────────────────────┐
│                                                                                             │
│  [Usuário]                                                                                  │
│     │ HTTPS :443                                                                            │
│     ▼                                                                                       │
│  ┌─────────────────────────────────────────────────────────┐                               │
│  │                   CADDY (Reverse Proxy)                  │                               │
│  │              Portas: 80 (HTTP→HTTPS) / 443               │                               │
│  └───────────┬─────────────────────────────────────────────┘                               │
│              │                          │                                                   │
│   /api/* /actuator/*              /* (demais rotas)                                         │
│              │                          │                                                   │
│              ▼                          ▼                                                   │
│  ┌─────────────────────┐    ┌───────────────────────┐                                      │
│  │   JAVA CORE API     │    │   NEXT.JS FRONTEND    │                                      │
│  │  (Spring Boot 3)    │    │   (React + TypeScript) │                                      │
│  │   Porta interna     │    │   Porta interna :3000  │                                      │
│  │       :8080         │    └───────────────────────┘                                      │
│  └──────┬──────────────┘                                                                    │
│         │                                                                                   │
│         ├──── publica jobs ────────────────────────────────────────────────────────────┐   │
│         │                                                                               │   │
│         ▼                                                                               │   │
│  ┌──────────────────┐    ┌───────────────────────────────────────────────────────┐     │   │
│  │    RABBITMQ      │◄───│               RUST SERVICES                           │     │   │
│  │  (Mensageria)    │    │  ┌──────────────────┐  ┌──────────────────────────┐  │     │   │
│  └────────┬─────────┘    │  │  rag-worker       │  │  ingestion-worker        │  │     │   │
│           │              │  │  (busca vetorial  │  │  (processa docs,         │  │     │   │
│           │              │  │   + Gemini LLM)   │  │   gera chunks)           │  │     │   │
│           │              │  └────────┬──────────┘  └─────────┬────────────────┘  │     │   │
│           │              │           │                        │                   │     │   │
│           │              │  ┌────────▼──────────┐  ┌─────────▼──────────────┐   │     │   │
│           │              │  │ embedding-service  │  │  workflow-worker        │   │     │   │
│           │              │  │ (Axum :8000)       │  │  (DAG execution)        │   │     │   │
│           │              │  └───────────────────┘  └────────────────────────┘   │     │   │
│           │              └───────────────────────────────────────────────────────┘     │   │
│           │                                                                             │   │
│           │              ┌───────────────────────────────────────────┐                 │   │
│           └─────────────►│         PYTHON SERVICES                   │                 │   │
│                          │  crew-worker (CrewAI + litellm)           │                 │   │
│                          └───────────────────────────────────────────┘                 │   │
│                                                                                         │   │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐                  │   │
│  │   POSTGRESQL     │   │     REDIS        │   │      MINIO       │◄─────────────────┘   │
│  │  + pgvector      │   │    (Cache)       │   │  (Object Store   │                       │
│  │  (Dados + Vetor) │   │                  │   │   S3-compatible) │                       │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘                      │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

Sistemas externos:
  ┌──────────────────────────────────────┐
  │  Google Cloud / Vertex AI Gemini API │  ◄── rag-worker, embedding-service, crew-worker
  └──────────────────────────────────────┘
```

---

## 3. Diagrama C4 — Nível 3: Componentes do Java Core

```
┌──────────────────────────────────── JAVA CORE (Spring Boot) ──────────────────────────────────┐
│                                                                                                  │
│  ┌─────────────────── Camada REST (interfaces/rest) ───────────────────┐                        │
│  │                                                                       │                        │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │                        │
│  │  │ AgentController  │  │ExecutionController│  │DocumentController │  │                        │
│  │  │ POST /agents     │  │POST /executions   │  │GET /documents     │  │                        │
│  │  │ GET  /agents     │  │GET  /executions/  │  │DELETE /documents  │  │                        │
│  │  └────────┬─────────┘  └────────┬──────────┘  └────────┬──────────┘  │                        │
│  │           │                     │                       │              │                        │
│  │  ┌────────▼──────────────────────▼───────────────────────▼──────────┐ │                        │
│  │  │                     ChatController                                │ │                        │
│  │  │             GET/POST /conversations, /messages                    │ │                        │
│  │  └────────────────────────────────────────────────────────────────── ┘ │                        │
│  └──────────────────────────────────────────────────────────────────────┘                        │
│                              │                                                                    │
│  ┌─────────────────── Camada de Aplicação (application) ───────────────┐                        │
│  │                                                                       │                        │
│  │  ┌───────────────┐   ┌────────────────┐   ┌───────────────────────┐ │                        │
│  │  │  AgentService │   │  ChatService   │   │    AuditService       │ │                        │
│  │  │ (ZIP parse,   │   │ (histórico de  │   │  (grava audit_logs)   │ │                        │
│  │  │  MinIO upload,│   │  conversas)    │   └───────────────────────┘ │                        │
│  │  │  doc publish) │   └────────────────┘                             │                        │
│  │  └───────────────┘                                                   │                        │
│  └──────────────────────────────────────────────────────────────────────┘                        │
│                              │                                                                    │
│  ┌─────────────────── Camada de Domínio (domain) ──────────────────────┐                        │
│  │                                                                       │                        │
│  │  Entidades JPA: Agent, Document, DocumentChunk, Conversation,        │                        │
│  │  Message, AgentExecution, ToolCall, RetrievalEvent,                  │                        │
│  │  User, Role, Permission, AuditLog                                    │                        │
│  │                                                                       │                        │
│  │  Repositórios: AgentRepository, DocumentRepository,                  │                        │
│  │  AgentExecutionRepository, ConversationRepository,                   │                        │
│  │  MessageRepository, UserRepository, RoleRepository, ...              │                        │
│  └──────────────────────────────────────────────────────────────────────┘                        │
│                              │                                                                    │
│  ┌─────────────────── Camada de Infraestrutura (infrastructure) ────────┐                        │
│  │                                                                       │                        │
│  │  ┌──────────────────────────────────────┐                            │                        │
│  │  │  AgentExecutionEventListener          │ ◄── RabbitMQ              │                        │
│  │  │  (consome agent.execution.events,     │     (agent.execution.     │                        │
│  │  │   atualiza status de AgentExecution)  │      events)              │                        │
│  │  └──────────────────────────────────────┘                            │                        │
│  │                                                                       │                        │
│  │  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────┐ │                        │
│  │  │ SecurityConfig │  │  RabbitMQConfig  │  │     MinioConfig      │ │                        │
│  │  │ (⚠️ permitAll) │  │  (exchanges,     │  │ (bucket client)      │ │                        │
│  │  │                │  │   queues, DLQ)   │  └──────────────────────┘ │                        │
│  │  └────────────────┘  └─────────────────┘                            │                        │
│  └──────────────────────────────────────────────────────────────────────┘                        │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. ERD — Diagrama Entidade-Relacionamento Completo

```
┌──────────────┐       ┌──────────────────┐       ┌────────────────────┐
│    users     │       │   user_roles     │       │      roles         │
│──────────────│       │──────────────────│       │────────────────────│
│ id (PK)      │◄──────│ user_id (FK)     │──────►│ id (PK)            │
│ username     │       │ role_id (FK)     │       │ name               │
│ email        │       └──────────────────┘       │ description        │
│ password_hash│                                   └────────┬───────────┘
│ first_name   │                                            │
│ last_name    │                                   ┌────────▼───────────┐
│ status       │                                   │  role_permissions  │
│ created_at   │                                   │────────────────────│
│ updated_at   │                                   │ role_id (FK)       │
└──────┬───────┘                                   │ permission_id (FK) │
       │                                           └────────┬───────────┘
       │  created_by                                        │
       │                                           ┌────────▼───────────┐
       │                                           │    permissions     │
       │                                           │────────────────────│
       │                                           │ id (PK)            │
       │                                           │ name               │
       │                                           │ description        │
       │                                           └────────────────────┘
       │
       ├─────────────────────────────────────────────────────────────────┐
       │                                                                  │
       ▼                                                                  ▼
┌──────────────┐       ┌──────────────────────┐       ┌───────────────────┐
│   agents     │       │    conversations     │       │    audit_logs     │
│──────────────│       │──────────────────────│       │───────────────────│
│ id (PK)      │◄──┐   │ id (PK)              │       │ id (PK)           │
│ tenant_id    │   │   │ user_id (FK→users)   │       │ user_id (FK)      │
│ name         │   │   │ tenant_id            │       │ action            │
│ system_instr │   │   │ title                │       │ target            │
│ zip_path     │   │   │ agent_id (FK→agents)─┼───►   │ ip_address        │
│ created_at   │   │   │ created_at           │       │ user_agent        │
│ updated_at   │   │   │ updated_at           │       │ details (JSONB)   │
└──────┬───────┘   │   └────────┬─────────────┘       │ created_at        │
       │           │            │                      └───────────────────┘
       │           │            ▼
       │           │   ┌──────────────────────┐
       │           │   │      messages        │
       │           │   │──────────────────────│
       │           │   │ id (PK)              │
       │           │   │ conversation_id (FK) │
       │           │   │ author_role          │
       │           │   │  (USER/ASSISTANT/    │
       │           │   │   SYSTEM)            │
       │           │   │ content              │
       │           │   │ created_at           │
       │           │   └──────────────────────┘
       │           │
       ▼           │
┌──────────────────┐       ┌─────────────────────────┐
│    documents     │       │     agent_executions    │
│──────────────────│       │─────────────────────────│
│ id (PK)          │       │ id (PK)                 │
│ name             │       │ conversation_id (FK)    │
│ file_path        │       │ agent_id                │
│ file_size        │  ┌───►│ status                  │
│ file_type        │  │    │  (REQUESTED/QUEUED/     │
│ status           │  │    │   STARTED/THINKING/     │
│ processing_error │  │    │   TOOL_RUNNING/         │
│ created_by (FK)  │  │    │   RETRIEVAL_RUNNING/    │
│ tenant_id        │  │    │   COMPLETED/FAILED)     │
│ agent_id (FK)────┼──┘    │ prompt_final            │
│ created_at       │       │ output_result           │
│ updated_at       │       │ error_message           │
└────────┬─────────┘       │ tokens_consumed         │
         │                 │ started_at              │
         ▼                 │ finished_at             │
┌──────────────────┐       └──────────┬──────────────┘
│  document_chunks │                  │
│──────────────────│         ┌────────┴─────────────────────┐
│ id (PK)          │         │                              │
│ document_id (FK) │         ▼                              ▼
│ chunk_index      │  ┌──────────────────┐   ┌────────────────────────┐
│ content          │  │   tool_calls     │   │   retrieval_events     │
│ embedding        │  │──────────────────│   │────────────────────────│
│  vector(768)     │  │ id (PK)          │   │ id (PK)                │
│ page_number      │  │ execution_id (FK)│   │ execution_id (FK)      │
│ tenant_id        │  │ tool_name        │   │ document_id            │
│ created_at       │  │ input_payload    │   │ chunk_id               │
└──────────────────┘  │  (JSONB)         │   │ similarity_score       │
                      │ output_response  │   │ retrieved_content      │
                      │ execution_time_ms│   │ created_at             │
                      │ status           │   └────────────────────────┘
                      │ error_log        │
                      │ created_at       │
                      └──────────────────┘

┌─────────────────────────┐    ┌────────────────────────┐
│  workflow_definitions   │    │   workflow_versions    │
│─────────────────────────│    │────────────────────────│
│ id (PK)                 │◄───│ workflow_id (FK, PK)   │
│ name (UNIQUE)           │    │ version (PK)           │
│ description             │    │ created_at             │
│ active_version          │    │ created_by             │
│ created_at              │    └──────────┬─────────────┘
│ updated_at              │               │
└─────────────────────────┘      ┌────────┴──────────────────┐
                                 │                           │
                                 ▼                           ▼
                         ┌──────────────────┐   ┌───────────────────────┐
                         │  workflow_nodes  │   │   workflow_edges      │
                         │──────────────────│   │───────────────────────│
                         │ id (PK)          │   │ id (PK)               │
                         │ workflow_id (FK) │   │ workflow_id (FK)      │
                         │ version (FK)     │◄──│ version (FK)          │
                         │ type             │   │ from_node_id (FK)     │
                         │  (RAG/TOOL/      │◄──│ to_node_id (FK)       │
                         │   CONDITION)     │   │ condition             │
                         │ config (JSONB)   │   └───────────────────────┘
                         └──────────────────┘

Índices críticos:
  document_chunks.embedding  → HNSW vector_cosine_ops
  agents.tenant_id           → B-Tree
  documents.agent_id         → B-Tree
  conversations.tenant_id    → B-Tree (composto com user_id)
  agent_executions.status    → B-Tree
```

---

## 5. Fluxo de Mensagens RabbitMQ

```
Exchange: agent.execution.exchange  (topic)
│
├── Routing Key: document.ingestion.jobs
│   Publisher:  Java Core (AgentService / DocumentController)
│   Consumer:   Rust ingestion-worker  [event-driven, loop bloqueante — NÃO usa polling]
│   Payload:    { document_id, file_path, tenant_id, file_type }
│   ⚠️ NACK sem DLQ: falhas são descartadas (requeue: false), sem retry automático
│
├── Routing Key: agent.retrieval.queue
│   Publisher:  Java Core (ExecutionController)
│   Consumer:   Rust rag-worker
│   Payload:    { executionId, agentId, tenantId, prompt }
│
├── Routing Key: agent.execution.jobs
│   Publisher:  Java Core (ExecutionController)
│   Consumer:   Python crew-worker
│   Payload:    { executionId, agentId, tenantId, prompt }
│
└── Fila de Eventos: agent.execution.events
    Publisher:  Rust rag-worker / Python crew-worker
    Consumer:   Java Core (AgentExecutionEventListener)
    Eventos:    AgentExecutionStarted | RetrievalStarted | RetrievalCompleted
                ToolCallStarted | ToolCallFinished | AgentExecutionFinished
                AgentExecutionFailed
```

---

## 6. Spec Impact Matrix

Mapa de dependências entre componentes — identifica o raio de impacto de cada mudança.

| Componente alterado | Impacta diretamente | Impacta indiretamente | Nível de risco |
|---------------------|---------------------|-----------------------|----------------|
| Schema PostgreSQL (migrations) | Java Core (JPA/Flyway), Rust workers (queries SQL), Python crew-worker (psycopg2) | Frontend (entidades de resposta), CI/CD | 🔴 ALTO |
| RabbitMQ (filas/exchanges) | Java Core (publisher), Rust workers (consumer), Python crew-worker (consumer) | AgentExecution status machine | 🔴 ALTO |
| Vertex AI / Gemini API | Rust rag-worker, Rust embedding-service, Python crew-worker | Qualidade das respostas RAG | 🔴 ALTO |
| Java Core REST API (contratos) | Next.js Frontend (todos os hooks/use-cases), CI/CD E2E | — | 🔴 ALTO |
| AgentExecution status machine | Java Core EventListener, Frontend timeline (useExecution), Rust/Python workers | Audit logs | 🟡 MÉDIO |
| embedding-service (porta 8000, dimensão do vetor) | Rust rag-worker (POST para embedding-service), Rust ingestion-worker | document_chunks.embedding (reindex obrigatório ao mudar dimensão) | 🔴 ALTO |
| ingestion-worker (chunking) | chunk_size=1000 / chunk_overlap=200 hardcoded — qualidade do RAG depende desses valores | document_chunks, recall da busca vetorial | 🟡 MÉDIO |
| ingestion-worker (NACK sem DLQ) | Jobs com falha são descartados silenciosamente — documento fica em `FAILED` sem retry | Operação / SRE | 🔴 ALTO |
| ingestion-worker (parsers de formato) | Apenas PDF (lopdf) e texto plano implementados — `.docx` tratado como texto, `.md` sem parser semântico | Qualidade de ingestão, base de conhecimento | 🟡 MÉDIO |
| SecurityConfig (Spring Security) | Todos os endpoints REST | Frontend auth flow | 🟡 MÉDIO |
| Caddy (Caddyfile routing) | Frontend, Java Core (URLs de callback) | CORS, TLS | 🟡 MÉDIO |
| MinIO (bucket structure) | Java Core (AgentService upload), Rust ingestion-worker (download) | Document.filePath | 🟡 MÉDIO |
| Agent.systemInstructions | Rust rag-worker (prompt LLM), Python crew-worker (backstory) | Qualidade das respostas | 🟡 MÉDIO |
| document_chunks (chunk size / strategy) | Rust ingestion-worker, Rust rag-worker (retrieval quality) | Qualidade do RAG, similaridade scores | 🟡 MÉDIO |
| workflow_nodes / workflow_edges | Rust workflow-worker (DAG execution) | AgentExecution (se workflow gerar execuções) | 🟢 BAIXO |
| Frontend (Next.js UI) | — | — | 🟢 BAIXO |
| Redis | 🔴 LACUNA — uso não identificado nos workers analisados | — | 🟡 MÉDIO |

---

## 7. Decisões Arquiteturais Ativas (resumo)

| ID | Decisão | Alternativa rejeitada | Status |
|----|---------|----------------------|--------|
| ADR-A01 | Monorepo multi-linguagem (Java + Rust + Python + Next.js) | Microsserviços em repos separados | ✅ Ativo |
| ADR-A02 | Comunicação assíncrona via RabbitMQ (Java → Workers) | REST síncrono direto | ✅ Ativo |
| ADR-A03 | pgvector com HNSW como vector store | Pinecone, Weaviate, IVFFlat | ✅ Ativo |
| ADR-A04 | Vertex AI / Gemini para LLM e embeddings | OpenAI (abandonado), AnythingLLM (removido) | ✅ Ativo |
| ADR-A05 | Caddy como API Gateway com TLS automático | Nginx, AWS ALB | ✅ Ativo |
| ADR-A06 | Multitenancy por `tenant_id` em todas as entidades principais | Schema-per-tenant | ✅ Ativo (parcial — `agent_executions` sem `tenant_id`) |
| ADR-A07 | JWT + RBAC planejado, atualmente desabilitado (`permitAll`) | — | 🔴 LACUNA CRÍTICA |
