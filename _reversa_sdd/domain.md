# Modelo de Domínio — Alfabra-Vector

> Gerado pelo Reversa em 2026-06-19
> Nível: Essencial | Idioma: Português

---

## 1. Linguagem Ubíqua (Ubiquitous Language)

| Termo | Definição | Onde aparece |
|-------|-----------|--------------|
| **Agente** | Entidade de IA configurada com instruções de comportamento (system instructions) e base de conhecimento própria. | `agents` (DB), `AgentController`, `Agent.java` |
| **Base de Conhecimento** | Conjunto de documentos indexados associados a um Agente, usados pelo RAG para compor respostas. | `documents`, `document_chunks` (DB) |
| **Conversa** | Sessão de chat entre Usuário e Agente com histórico de mensagens persistido. | `conversations`, `messages` (DB), `ChatController` |
| **Execução** | Processamento de um prompt pelo Worker (Rust rag-worker ou Python crew-worker), com ciclo de vida rastreado. | `agent_executions` (DB), `ExecutionController` |
| **Ingestão** | Extração de texto de documento, chunking e geração de embeddings para indexação no pgvector. | `ingestion-worker` (Rust), `document.ingestion.jobs` (RabbitMQ) |
| **Chunk** | Fragmento de texto de documento com embedding vetorial associado. Unidade básica de recuperação no RAG. | `document_chunks` (DB) |
| **Embedding** | Representação vetorial numérica de texto (768 dimensões, Gemini). Permite busca semântica por similaridade. | `document_chunks.embedding`, `embedding-service` (Rust) |
| **RAG** | Retrieval-Augmented Generation — recupera chunks relevantes da base de conhecimento e os injeta no prompt do LLM. | `rag-worker` (Rust) |
| **Tenant** | Organização isolada na plataforma. Agentes, documentos e conversas são segregados por `tenant_id`. | Todas as entidades principais (DB) |
| **System Instructions** | Texto de configuração comportamental do Agente, extraído do `.md` dentro do ZIP de cadastro. | `agents.system_instructions` (DB) |
| **Workflow** | DAG (grafo dirigido acíclico) de passos de execução (nós RAG, Tool, Condition) orquestrado pelo workflow-worker. | `workflow_definitions`, `workflow_nodes`, `workflow_edges` (DB) |
| **Tool Call** | Invocação de ferramenta externa pelo agente durante Execução (ex: `calculate_sandbox_quota`). | `tool_calls` (DB) |
| **Retrieval Event** | Registro de quais chunks foram recuperados e seus scores de similaridade numa Execução RAG. | `retrieval_events` (DB) |
| **Audit Log** | Registro imutável de ações do sistema (upload, execução) para rastreabilidade. | `audit_logs` (DB), `AuditService` |
| **Sandbox Quota** | Limite de tokens por Tenant. Calculado pela tool `calculate_sandbox_quota` no crew-worker. | `agent_executions.tokens_consumed` |

---

## 2. Entidades e Relacionamentos

```
TENANT (contexto de isolamento)
  │
  ├── tem muitos ──► AGENT
  │                    ├── tem muitos ──► DOCUMENT ──► DOCUMENT_CHUNK (embedding)
  │                    └── participa de ──► CONVERSATION
  │                                           ├── tem muitos ──► MESSAGE
  │                                           └── gera ──► AGENT_EXECUTION
  │                                                           ├── registra ──► TOOL_CALL
  │                                                           └── registra ──► RETRIEVAL_EVENT
  ├── tem muitos ──► USER (inicia Conversation)
  └── tem muitos ──► AUDIT_LOG

WORKFLOW_DEFINITION ──► WORKFLOW_VERSION ──► WORKFLOW_NODE ──► WORKFLOW_EDGE
```

---

## 3. Bounded Contexts

| Bounded Context | Responsabilidade | Módulo principal |
|-----------------|-----------------|-----------------|
| **Gestão de Agentes** | Cadastro e configuração de agentes com bases de conhecimento | Java Core (`AgentController`, `AgentService`) |
| **Gestão de Documentos** | Upload, ingestão e indexação vetorial de documentos | Java Core (`DocumentController`) + Rust `ingestion-worker` |
| **Conversação RAG** | Execução de prompts via busca semântica e LLM Gemini | Java Core (`ExecutionController`) + Rust `rag-worker` |
| **Conversação CrewAI** | Pipelines cognitivos com agentes autônomos | Java Core (`ExecutionController`) + Python `crew-worker` |
| **Histórico de Chat** | Persistência e recuperação do histórico de mensagens | Java Core (`ChatController`) |
| **Orquestração de Workflows** | Definição e execução de DAGs de processamento | Rust `workflow-worker` |
| **Segurança e Auditoria** | RBAC, autenticação e log de ações (parcialmente implementado) | Java Core (`SecurityConfig`, `AuditService`) |

---

## 4. Regras de Negócio por Entidade

### Agent
- ZIP deve conter ao menos um `.md` na raiz (system instructions obrigatório)
- ZIP descomprimido ≤ 20 MB
- Documentos aceitos no ZIP: `.pdf`, `.docx`, `.txt`, `.md`
- Se `tenantId` não informado, usa UUID zero (fallback legado — 🔴 dívida)

### Document
- Criado com status `PROCESSING` ao ser aceito pelo upload
- Caminho MinIO: `documents/{uuid}/{filename}` (avulso) ou `agents-data/agent-{id}/...` (via ZIP)
- Ciclo: `UPLOADING → PROCESSING → INDEXED | FAILED`

### AgentExecution
- Toda execução persiste `Message` de role `USER` antes de publicar no RabbitMQ
- Ao concluir com sucesso, worker publica `AgentExecutionFinished` e Java Core persiste resposta como `Message` role `ASSISTANT`
- Timeout de 2 min é controlado exclusivamente no frontend — não persiste `TIMEOUT` no banco
- `tokens_consumed` preenchido pelo worker ao finalizar

### Conversation
- Criada automaticamente na primeira execução se `conversationId` não fornecido
- Título padrão: "Chat com {nome do agente}" ou "Conversa de Teste RAG"
