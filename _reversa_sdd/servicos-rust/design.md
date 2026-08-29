# Serviços Rust, Design Técnico

## Interface

### Endpoints Internos (`embedding-service` via API HTTP Axum)
| Método | Caminho | Entrada | Saída | Status codes |
|--------|---------|---------|-------|--------------|
| POST | `/v1/embeddings` | `EmbeddingsRequest` | `EmbeddingsResponse` | 200, 500, 429 |
| GET | `/healthz` | - | `{ status: "ok" }` | 200 |

### AMQP Consumers (`ingestion-worker`, `rag-worker`, `workflow-worker`)
| Símbolo | Fila Consumida | Ação |
|---------|-----------|---------|
| `IngestionWorker` | `document.ingestion.jobs` | Realiza pipeline OCR/Parser -> Embeddings -> Postgres. |
| `RagWorker` | `agent.retrieval.queue` | Lê metadados, busca embeddings, faz query `<=>` no pgvector e lança `RetrievalCompleted`. |
| `WorkflowWorker` | `agent.workflow.queue` | Processa etapas do DAG. |

## Fluxo Principal (Pipeline de Ingestão)
1. Recebe `IngestionJob` do RabbitMQ.
2. Faz GET via SDK de S3/MinIO para o path especificado (usando credentials do host).
3. Baseado em `file_type`, instancia o conversor (`lopdf` ou `docx_rs`) para obter string bruta.
4. Processa o text splitter (chunking via heurísticas de NLP ou delimitadores), montando um array de substrings.
5. Emite POST `HTTP /v1/embeddings` para o próprio `embedding-service` interno da rede Docker para transformar as strings em vetores float array 768d.
6. Abre transação Postgres SQL (sqlx nativo) e apaga dados pré-existentes.
7. Realiza `INSERT INTO document_chunks` via multi-insert.
8. Envia status de Sucesso para Fila/Banco e comita a transação.

## Fluxos Alternativos
- **Arquivo Corrompido:** Se `lopdf` falha, o job é ejetado. Incrementa-se a retry count do header AMQP. Ao estourar `INGESTION_MAX_RETRIES`, o erro cai na DLQ `document.ingestion.jobs.dlq` e o status da tabela document no banco vai para FAILED.
- **Ambiente de Desenvolvimento:** Se flag `EMBEDDING_PROVIDER=mock`, o `embedding-service` gera hashes determinísticos em vez de chamar Vertex API, poupando custo de IO e Google Cloud na máquina do desenvolvedor.

## Dependências
- **Tokio:** Runtime Assíncrono Rust.
- **Lapin:** Driver AMQP (RabbitMQ).
- **Sqlx (Postgres):** Acesso nativo, compile-time query validation e suporte a tipos PgVector.
- **Axum:** Servidor web rápido para a API interna.
- **Reqwest:** Chamadas HTTP para o GCP/Vertex.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Monorepo Cargo Workspaces | `rust-services/Cargo.toml` | 🟢 |
| Heartbeat Reaper em thread separada no ingestion-worker | Lógica identificada de limpeza | 🟢 |
| Fallback dinâmico entre Vertex AI Token e Google AI Key | Tratamento de environment vars | 🟢 |
| Configuração flexível RAG_TOP_K via env vars (Issue #246) | Variável `RAG_TOP_K` | 🟢 |

## Estado Interno
- O Rust Service é _stateless_. A única retenção temporal é o cache TCP de conexões para o RabbitMQ e PG pool geridos internamente pelos drivers.

## Observabilidade
- Emissão de logs estruturados (provavelmente usando `tracing` crate do ecosistema Tokio) para health probes de kubernetes (porta 8000).

## Riscos e Lacunas
- 🟢 Para o processamento de PDFs massivos, foram estabelecidos limites rígidos de RAM/buffer no código Rust (Memory Leak Prevention), não dependendo apenas do OOM Killer do Docker. Falhas de ingestão devem resultar em NACK roteado para uma DLQ, evitando descarte silencioso.
