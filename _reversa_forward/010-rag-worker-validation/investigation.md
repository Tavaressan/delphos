# Investigation: Validação e Testes E2E do RAG Worker Rust

Este documento detalha o mapeamento do fluxo de RAG nativo e barramento de eventos do RabbitMQ para subsidiar os testes de homologação.

## 1. Fluxo de Eventos no RabbitMQ

No novo design do RAG, o processamento ocorre via:
* **Exchange:** `agent.execution.exchange`
* **Fila RAG:** `agent.retrieval.queue` (routing key: `agent.retrieval.requested`)
* **Fluxo de Mensagens:**
  * Backend Java publica solicitação de busca semântica na fila `agent.retrieval.requested`.
  * O worker Rust (`rag-worker`) consome a mensagem, executa a query SQL de distância cossena vetorial na tabela `document_chunks`, e formula o prompt de contexto.
  * O worker chama o Vertex AI Gemini via REST, obtendo a resposta sintetizada.
  * O worker publica `RetrievalCompleted` de volta no RabbitMQ.

## 2. Configurações e Variáveis de Ambiente no Docker Compose

Para que a validação E2E funcione corretamente, as seguintes configurações do `docker-compose.yml` precisam ser respeitadas:
* O container `rag-worker` deve ter volumes compartilhados de GCP Credentials e apontar para a variável de ambiente:
  * `GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/gcp-key.json`
* A string de conexão do Postgres deve apontar para o host do banco com a extensão `pgvector` instalada.
