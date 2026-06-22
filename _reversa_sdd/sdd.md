# Software Design Document (SDD) — Alfabra-Vector

> Gerado pelo Reversa em 2026-06-19
> Nível: Essencial | Idioma: Português

---

## 1. Specs por Componente

### 1.1. Gestão de Agentes

**Responsável:** Java Core (`AgentController` + `AgentService`)

#### Spec: Criar Agente
- **Entrada:** `multipart/form-data` com campos `name` (string), `file` (ZIP), `tenantId` (UUID, opcional)
- **Processamento:**
  1. Valida ZIP: deve ter ≥ 1 arquivo `.md` na raiz e tamanho descomprimido ≤ 20 MB
  2. Extrai `systemInstructions` do primeiro `.md` encontrado
  3. Persiste `Agent` no PostgreSQL
  4. Faz upload do ZIP para MinIO em `agents-data/agent-{id}/agent.zip`
  5. Extrai e faz upload individual de `.pdf`, `.docx`, `.txt`, `.md` para MinIO
  6. Para cada arquivo de conhecimento, cria `Document` (status `PROCESSING`) e publica job em RabbitMQ (`document.ingestion.jobs`)
- **Saída:** `{ id, name, systemInstructions, zipPath, tenantId }`
- **Erros:** `400` se ZIP vazio, sem `.md`, ou acima de 20 MB; `500` para falhas de I/O

#### Spec: Listar Agentes
- **Entrada:** Query param `tenantId` (UUID, opcional; default UUID zero)
- **Processamento:** Busca agentes pelo `tenant_id` no banco
- **Saída:** Array de `Agent`

---

### 1.2. Gestão de Documentos

**Responsável:** Java Core (`DocumentController`) + Rust `ingestion-worker`

#### Spec: Upload de Documento Avulso
- **Entrada:** `multipart/form-data` com `file`, `agentId` (opcional), `tenantId` (opcional)
- **Processamento:**
  1. Valida arquivo não-vazio
  2. Gera UUID para o documento
  3. Faz upload para MinIO em `documents/{uuid}/{filename}`
  4. Persiste `Document` com status `PROCESSING`
  5. Registra `UPLOAD_DOCUMENT` em `audit_logs`
  6. Publica job em RabbitMQ (`document.ingestion.jobs`) com `{ document_id, file_path, tenant_id, file_type }`
- **Saída:** `{ id, name, status, agentId, tenantId }`
- **Erros:** `400` se arquivo vazio; `500` para falhas MinIO ou RabbitMQ

#### Spec: Listar Documentos
- **Entrada:** Query param `tenantId` (UUID, opcional)
- **Saída:** Array de `Document` filtrado por tenant

#### Spec: Ingestão (Rust ingestion-worker)
- **Trigger:** Mensagem RabbitMQ na fila `document.ingestion.jobs`
- **Processamento:**
  1. Baixa arquivo do MinIO
  2. Extrai texto conforme `file_type` (via `document-processing`)
  3. Divide em chunks (tamanho e overlap configuráveis)
  4. Para cada chunk: chama `embedding-service` (HTTP POST `:8000`) para gerar vetor 768D
  5. Persiste `DocumentChunk` com `embedding`, `tenant_id`, `chunk_index`, `page_number`
  6. Atualiza `Document.status` para `INDEXED`
- **Falha:** Atualiza `Document.status` para `FAILED` com `processing_error`

---

### 1.3. Execução RAG

**Responsável:** Java Core (`ExecutionController`) + Rust `rag-worker`

#### Spec: Submeter Execução
- **Entrada:** `{ prompt, tenantId, conversationId?, agentId? }`
- **Processamento:**
  1. Resolve ou cria `User` default (`admin`)
  2. Resolve ou cria `Conversation` (com `tenant_id` e `agent_id`)
  3. Persiste `Message` role `USER` com o prompt
  4. Cria `AgentExecution` status `REQUESTED`
  5. Publica payload em RabbitMQ (`agent.execution.jobs` ou `agent.retrieval.queue`)
  6. Atualiza status para `QUEUED`
  7. Registra `SUBMIT_RAG_CHAT` em `audit_logs`
- **Saída:** `{ executionId, conversationId, status, prompt, tenantId, agentId }`
- **Erros:** `500` para falhas de banco ou RabbitMQ

#### Spec: Consultar Status de Execução (Polling)
- **Entrada:** Path param `{id}` (UUID da execução)
- **Saída:** `{ executionId, status, prompt, output, errorMessage, tokensConsumed, startedAt, finishedAt }`
- **Erros:** `404` se execução não encontrada

#### Spec: Processamento RAG (Rust rag-worker)
- **Trigger:** Mensagem RabbitMQ em `agent.retrieval.queue`
- **Processamento:**
  1. Publica evento `RetrievalStarted`
  2. Chama `embedding-service` com o prompt → vetor 768D
  3. Busca vetorial no pgvector: `SELECT ... ORDER BY embedding <=> $query_vec LIMIT 5` filtrado por `tenant_id` e `agent_id`
  4. Recupera `system_instructions` do agente (fallback: prompt padrão Alfabra)
  5. Monta prompt final: system_instructions + chunks + query
  6. Chama Vertex AI Gemini (`generateContent`) com token OAuth via `GcpAuthenticator`
  7. Publica `RetrievalCompleted` com texto da resposta e metadados dos chunks
  8. Java Core EventListener persiste resultado e publica `AgentExecutionFinished`
- **Falha:** Publica `AgentExecutionFailed` em qualquer erro de rede

#### Spec: Roteamento de Eventos (Java Core `AgentExecutionEventListener`)
| Evento recebido | Ação |
|----------------|------|
| `AgentExecutionStarted` | Status → `STARTED` |
| `RetrievalStarted` | Status → `RETRIEVAL_RUNNING` |
| `RetrievalCompleted` | Status → `THINKING`; insere `RetrievalEvent` |
| `ToolCallStarted` | Status → `TOOL_RUNNING`; insere `ToolCall` |
| `ToolCallFinished` | Status → `THINKING`; atualiza `ToolCall` |
| `AgentExecutionFinished` | Status → `COMPLETED`; salva output; insere `Message` role `ASSISTANT` |
| `AgentExecutionFailed` | Status → `FAILED`; salva `errorMessage` |

---

### 1.4. Histórico de Chat

**Responsável:** Java Core (`ChatController`)

#### Spec: Listar Conversas
- **Entrada:** Query param `tenantId`
- **Saída:** Array de `Conversation` com `id`, `title`, `tenantId`, `agentId`, `createdAt`

#### Spec: Criar Conversa
- **Entrada:** `{ title?, tenantId?, agentId? }`
- **Saída:** `Conversation` persistida

#### Spec: Buscar Mensagens de uma Conversa
- **Entrada:** Path param `{id}` (UUID da conversa)
- **Saída:** Array de `Message` `{ id, authorRole, content, createdAt }` ordenado por `createdAt`
- **Erros:** `404` se conversa não encontrada

---

### 1.5. Execução CrewAI (Python crew-worker)

**Trigger:** Mensagem RabbitMQ em `agent.execution.jobs`

**Processamento:**
1. Publica `AgentExecutionStarted`
2. Executa busca RAG inicial via psycopg2 diretamente no pgvector
3. Instancia ferramentas:
   - `calculate_sandbox_quota(tenant_id)` — soma tokens consumidos pelo tenant
   - `search_knowledge_base(query)` — busca vetorial sob demanda
4. Instancia agente CrewAI "Elevator Specialist" (hardcoded) com backstory técnico Alfabra
5. Cria `Task` com o prompt + contexto RAG inicial + ferramentas
6. Executa `crew.kickoff()` sequencialmente
7. Publica `AgentExecutionFinished` com a resposta gerada

**Lacuna:** Agente CrewAI fixo — não parametriza por `agent_id` ou `system_instructions` do banco 🟡

---

### 1.6. Geração de Embeddings (Rust embedding-service)

**Exposição:** HTTP REST em `:8000`
**Chamadores:** `rag-worker`, `ingestion-worker`
**Função:** Recebe texto → chama Vertex AI Gemini Embedding API → retorna vetor float[] 768D
**Lacuna:** Interface HTTP interna não documentada via OpenAPI 🟡

---

## 2. Contratos de API — OpenAPI (resumido)

Base URL: `https://{dominio}/api`

```
POST   /admin/agents              Cria agente via ZIP
GET    /agents?tenantId=          Lista agentes do tenant

POST   /documents/upload          Upload de documento avulso
GET    /documents?tenantId=       Lista documentos do tenant

POST   /executions                Submete execução RAG ou CrewAI
GET    /executions/{id}           Consulta status e resultado de execução

GET    /chats?tenantId=           Lista conversas do tenant
POST   /chats                     Cria nova conversa
GET    /chats/{id}/messages       Busca histórico de mensagens

GET    /actuator/health           Health check (Spring Actuator)
```

### Schemas principais

**ExecutionRequest**
```json
{
  "prompt": "string (obrigatório)",
  "tenantId": "UUID (opcional)",
  "conversationId": "UUID (opcional)",
  "agentId": "UUID (opcional)"
}
```

**ExecutionResponse**
```json
{
  "executionId": "UUID",
  "conversationId": "UUID",
  "status": "REQUESTED | QUEUED | STARTED | RETRIEVAL_RUNNING | THINKING | TOOL_RUNNING | COMPLETED | FAILED",
  "prompt": "string",
  "output": "string | null",
  "errorMessage": "string | null",
  "tokensConsumed": "integer | null",
  "startedAt": "ISO-8601",
  "finishedAt": "ISO-8601 | null"
}
```

**AgentCreateResponse**
```json
{
  "id": "UUID",
  "name": "string",
  "systemInstructions": "string",
  "zipPath": "string",
  "tenantId": "UUID"
}
```

---

## 3. User Stories

### US-01: Consultar um agente de IA
> Como **colaborador**, quero enviar uma pergunta a um agente e receber uma resposta baseada nos documentos da empresa, para obter informações precisas sem pesquisar manualmente.

**Critérios de aceite:**
- O sistema aceita o prompt e retorna `executionId` em menos de 2 segundos
- O frontend exibe a timeline de status em tempo real (via polling 2s)
- A resposta aparece ao atingir status `COMPLETED`
- Se não responder em 2 min, exibe mensagem de timeout

---

### US-02: Cadastrar um novo agente
> Como **administrador**, quero criar um agente especializado fazendo upload de um ZIP com instruções e documentos, para que a equipe possa consultá-lo.

**Critérios de aceite:**
- Upload aceita ZIP ≤ 20 MB descomprimido
- ZIP deve conter ao menos um `.md` com as instruções
- Documentos `.pdf`, `.docx`, `.txt`, `.md` são indexados automaticamente
- Administrador recebe confirmação com o `id` do agente criado

---

### US-03: Adicionar documento à base de conhecimento
> Como **colaborador**, quero fazer upload de um documento para a base de conhecimento de um agente, para que as respostas passem a incluir essa informação.

**Critérios de aceite:**
- Arquivo aceito: `.pdf`, `.docx`, `.txt`, `.md`
- Upload retorna imediatamente com status `PROCESSING`
- Documento fica disponível para consulta RAG após status `INDEXED`
- Em caso de falha na ingestão, status muda para `FAILED`

---

### US-04: Visualizar histórico de uma conversa
> Como **colaborador**, quero ver o histórico completo de mensagens de uma conversa anterior, para retomar o contexto sem precisar repetir o problema.

**Critérios de aceite:**
- Mensagens retornadas em ordem cronológica
- `authorRole` indica claramente quem enviou (`USER` ou `ASSISTANT`)

---

### US-05: Isolamento de dados por tenant
> Como **administrador de TI**, quero garantir que agentes, documentos e conversas de uma organização nunca sejam visíveis para outra organização na plataforma.

**Critérios de aceite:**
- Todos os endpoints filtram por `tenant_id`
- Busca vetorial no RAG filtra por `tenant_id` e `agent_id`
- 🔴 **Bloqueador atual:** API não autentica o `tenantId` informado — qualquer cliente pode informar qualquer tenant (ver ADR-A07 / G-01)

---

## 4. Matriz Código/Spec

Rastreabilidade entre specs acima e arquivos de código-fonte.

| Spec | Arquivo(s) de implementação | Status |
|------|----------------------------|--------|
| Criar Agente | [AgentController.java](java-core/src/main/java/com/company/core/interfaces/rest/AgentController.java):27 / [AgentService.java](java-core/src/main/java/com/company/core/application/AgentService.java) | 🟢 Implementado |
| Listar Agentes | [AgentController.java](java-core/src/main/java/com/company/core/interfaces/rest/AgentController.java):58 | 🟢 Implementado |
| Upload Documento | [DocumentController.java](java-core/src/main/java/com/company/core/interfaces/rest/DocumentController.java):59 | 🟢 Implementado |
| Listar Documentos | [DocumentController.java](java-core/src/main/java/com/company/core/interfaces/rest/DocumentController.java):138 | 🟢 Implementado |
| Submeter Execução | [ExecutionController.java](java-core/src/main/java/com/company/core/interfaces/rest/ExecutionController.java):54 | 🟢 Implementado |
| Consultar Status | [ExecutionController.java](java-core/src/main/java/com/company/core/interfaces/rest/ExecutionController.java):151 | 🟢 Implementado |
| Roteamento de Eventos | [AgentExecutionEventListener.java](java-core/src/main/java/com/company/core/infrastructure/external/AgentExecutionEventListener.java) | 🟢 Implementado |
| Listar Conversas | [ChatController.java](java-core/src/main/java/com/company/core/interfaces/rest/ChatController.java):34 | 🟢 Implementado |
| Criar Conversa | [ChatController.java](java-core/src/main/java/com/company/core/interfaces/rest/ChatController.java):43 | 🟢 Implementado |
| Histórico de Mensagens | [ChatController.java](java-core/src/main/java/com/company/core/interfaces/rest/ChatController.java):79 | 🟢 Implementado |
| Processamento RAG | [rag-worker/src/rabbitmq.rs](rust-services/rag-worker/src/rabbitmq.rs):360 | 🟢 Implementado |
| Geração de Embeddings | [embedding-service/src/](rust-services/embedding-service/) | 🟡 Sem OpenAPI interna |
| Ingestão de Documentos | [ingestion-worker/src/](rust-services/ingestion-worker/) | 🟢 Implementado |
| Execução CrewAI | [crewai_adapter.py](python-services/crew-worker/src/runtime/crewai_adapter.py):208 | 🟡 Agente hardcoded |
| Autenticação JWT / RBAC | [SecurityConfig.java](java-core/src/main/java/com/company/core/infrastructure/config/SecurityConfig.java):31 | 🔴 Não implementado (`permitAll`) |
| Auditoria | [AuditService.java](java-core/src/main/java/com/company/core/application/AuditService.java) | 🟡 Sem `tenant_id` nos logs |
| Workflow DAG | [workflow-worker/src/](rust-services/workflow-worker/) | 🟡 Seed de teste apenas |
