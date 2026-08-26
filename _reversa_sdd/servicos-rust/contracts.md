# Serviços Rust, Contratos e Integrações

Este arquivo consolida os contratos HTTP/AMQP dos micro-workers em Rust.

## 1. REST API Interna (Axum)

### `embedding-service` API
- **Endpoint:** `POST /v1/embeddings`
- **Protocolo:** HTTP 1.1 / JSON
- **Body (`EmbeddingsRequest`):**
  ```json
  {
    "input": ["Chunk 1", "Chunk 2 text"],
    "dimensions": 768
  }
  ```
- **Response (`EmbeddingsResponse`):**
  ```json
  {
    "object": "list",
    "model": "gemini-embedding-001",
    "data": [
      {
        "index": 0,
        "embedding": [0.034, -0.012, 0.444, "..."]
      },
      {
        "index": 1,
        "embedding": [-0.011, 0.052, 0.999, "..."]
      }
    ],
    "usage": {
      "prompt_tokens": 150,
      "total_tokens": 150
    }
  }
  ```

## 2. Filas Consumidas (Inbound)

### `document.ingestion.jobs` (`ingestion-worker`)
- Evento postado pelo **Java Core**.
- Espera um payload JSON com chaves UUID: `document_id`, `tenant_id`, path no MinIO e formato (`file_type`).
- Envia resultado de Sucesso alterando o status no PostgreSQL diretamente, ou cai na `document.ingestion.jobs.dlq`.

### `agent.retrieval.queue` (`rag-worker`)
- Evento provável postado pelo **Python Worker** (quando detecta que a query tem RAG).
- Requer `prompt_text`, `tenant_id` e limites extras opcionais.
- A query processada tem seu resultado emitido de volta na fila principal (`agent.execution.events` como evento `RetrievalCompleted`).

### `agent.workflow.queue` (`workflow-worker`)
- Evento postado pelo Core quando um DAG é acionado.
- Consome passos e re-escreve status de sucesso via banco ou enfileira próximo nó.
