# Núcleo Java, Contratos e Integrações

Este arquivo consolida os contratos EXPOSTOS (fornecidos) e CONSUMIDOS pelo serviço de Gateway Java.

## 1. Eventos Assíncronos Produzidos (Outbound RabbitMQ)

### `document.ingestion.jobs`
Fila acionada quando o core recebe um novo PDF/DOCX via API.
- **Payload (`IngestionJob`):**
  ```json
  {
    "document_id": "uuid",
    "tenant_id": "uuid",
    "file_path": "s3://agents-data/uuid/arquivo.pdf",
    "file_type": "pdf"
  }
  ```

### `agent.execution.jobs`
Fila acionada quando o core recebe solicitação de Chat.
- **Payload:**
  ```json
  {
    "execution_id": "uuid",
    "tenant_id": "uuid",
    "agent_id": "uuid",
    "prompt": "Texto submetido"
  }
  ```

## 2. Eventos Assíncronos Consumidos (Inbound RabbitMQ)

### `agent.execution.events`
Fila central escutada pelo listener para atualizar banco de dados e repassar estado via SSE.
O payload segue o formato polimórfico (`EventPayload`):
```json
{
  "eventId": "uuid",
  "eventType": "AgentExecutionStarted | RetrievalStarted | ToolCallStarted | ...",
  "executionId": "uuid",
  "timestamp": "2026-08-26T10:00:00Z",
  "payload": { ... varia conforme eventType ... }
}
```

## 3. APIs REST Expostas

Documentadas em detalhe no dicionário da Especificação OpenAPI global (ver pasta `openapi/`). Destaques:
- **`POST /api/agents/upload`** (Multipart, max 20MB)
- **`POST /api/chat/stream`** (JSON -> SSE Streaming)
- **`GET /api/knowledge`** (JSON Pagination)
- **`POST /api/knowledge/upload`** (Multipart DOCX/PDF)
