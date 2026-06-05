# Data Delta: Modelos de Domínio e Payload DTOs

> Identificador da feature: `007-poc-api-integration`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/007-poc-api-integration/requirements.md`

Este documento especifica o delta de modelos de dados a ser introduzido no frontend Next.js para representar com fidelidade as estruturas do banco de dados relacional PostgreSQL mapeadas pelo legado e os payloads de API expostos pelo módulo `java-core`.

---

## 1. Novos Modelos de Domínio (TypeScript Entities)

Mapeados sob a pasta `src/domain/entities/`:

### 1.1. `AgentExecution`
Representa a execução cognitiva disparada e orquestrada pelo backend.
```typescript
export type ExecutionStatus = 'REQUESTED' | 'QUEUED' | 'THINKING' | 'TOOL_RUNNING' | 'COMPLETED' | 'FAILED';

export interface AgentExecution {
  id: string; // UUID
  conversationId: string; // UUID
  agentId: string; // UUID
  status: ExecutionStatus;
  prompt: string;
  output: string | null;
  errorMessage: string | null;
  tokensConsumed: number | null;
  startedAt: string | null; // ISO 8601 string
  finishedAt: string | null; // ISO 8601 string
}
```

### 1.2. `User`
```typescript
export interface User {
  id: string; // UUID
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INACTIVE';
}
```

### 1.3. `Conversation`
```typescript
export interface Conversation {
  id: string; // UUID
  title: string;
  userId: string;
  tenantId: string;
  createdAt: string;
}
```

---

## 2. Tipos de Transferência de Dados (API DTOs)

Mapeados sob a pasta `src/domain/dto/` para tipar estritamente as requisições e respostas do cliente HTTP:

### 2.1. `SubmitExecutionRequest`
Payload de submissão do prompt (`POST /api/executions`):
```typescript
export interface SubmitExecutionRequest {
  prompt: string;
  tenantId?: string; // Opcional, gerado aleatoriamente se ausente
}
```

### 2.2. `SubmitExecutionResponse`
Retorno do endpoint `POST /api/executions`:
```typescript
export interface SubmitExecutionResponse {
  executionId: string; // UUID
  conversationId: string; // UUID
  status: string; // e.g. "QUEUED"
  prompt: string;
  tenantId: string; // UUID
}
```

### 2.3. `GetExecutionResponse`
Retorno do endpoint `GET /api/executions/{id}`:
```typescript
export interface GetExecutionResponse {
  executionId: string; // UUID
  status: ExecutionStatus;
  prompt: string;
  output: string | null;
  errorMessage: string | null;
  tokensConsumed: number | null;
  startedAt: string | null; // ISO 8601 string
  finishedAt: string | null; // ISO 8601 string
}
```

---

## 3. Estruturas de Dados Mantidas em Mock Local

Para o correto funcionamento do frontend no escopo do PoC, as seguintes listas estáticas serão declaradas e mantidas em memória reativa no frontend, simulando a resposta das entidades até que o backend implemente seus respectivos CRUDs:

1. **Catálogo de Agentes (`INITIAL_AGENTS`):** Lista contendo dados estáticos dos 4 agentes de diagnóstico e RAG.
2. **Base de Conhecimento (`INITIAL_DOCS`):** Lista simulando arquivos em processamento (`PROCESSING`), erro (`FAILED`), e indexados (`INDEXED`), de modo que o usuário consiga testar visualmente a interface de documentos.
3. **Timeline Estática Parcial (`TIMELINE_EVENTS`):** Mapeamento estático dos passos intermediários da execução cognitiva para simulação visual da timeline reativa durante o polling de status.
