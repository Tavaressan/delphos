# Frontend, Contratos e Integrações

Este arquivo consolida os contratos de consumo das APIs do Java Core pelo SPA Frontend.

## 1. Chat Execution API
- **Endpoint:** `POST /api/chat/stream`
- **Protocolo:** HTTP 1.1 / SSE (Server-Sent Events)
- **Body:** `{ prompt: string, agentId: string, tenantId: string }`
- **Retorno Esperado:** 
  - Stream de `text/event-stream` com deltas (chunks de texto).
  - Pode emitir eventos especiais mapeados via `data:` (ex: `[DONE]`, `{"tool_running": "fetch_sales"}`).

## 2. Knowledge Base API
- **Endpoint:** `POST /api/knowledge/upload`
- **Protocolo:** HTTP 1.1 / `multipart/form-data`
- **Payload:** `file` (arquivo binário PDF ou DOCX)
- **Retorno Esperado:**
  - Status 201: Objeto `Document` contendo `id`, `name`, `status=UPLOADING`.

- **Endpoint:** `GET /api/knowledge`
- **Retorno Esperado:** Array de `Document` com seus status atuais, subsidiando o polling de 3s no frontend para visualização de indexação concluída.

## 3. Agent Catalog API
- **Endpoint:** `POST /api/agents/upload`
- **Protocolo:** HTTP 1.1 / `multipart/form-data`
- **Payload:** `file` (arquivo binário ZIP com a estrutura do Agente)
- **Retorno Esperado:** Status 201 se válido, ou 415 caso o mime-type passe, mas o magic-byte seja suspeito.
