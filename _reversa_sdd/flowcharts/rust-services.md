# Fluxogramas do Módulo: rust-services

## Worker de RAG (rag-worker) - Fluxo de Retrieval (Postgres pgvector)

```mermaid
flowchart TD
    MQ[(RabbitMQ)] -->|Consome Evento| W[rag-worker (Tokio Task)]
    W --> |Monta Query| Q[vector_search_query]
    Q --> |Executa SQL pgvector (sqlx)| DB[(PostgreSQL)]
    DB --> |Retorna Chunks + Similaridade| W
    W --> Sanitize[escape_chunk_content]
    Sanitize --> Format[format_context_entry]
    Format --> Prompt[Injeção no Contexto do Prompt]
    Prompt --> Vertex[Chamada Vertex AI / LLM]
    Vertex -->|Resposta LLM| ResultQueue[(RabbitMQ: agent.execution.replies)]
```
