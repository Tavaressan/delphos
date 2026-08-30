# Spec Impact Matrix

Esta matriz rastreia como as especificações dos componentes afetam uns aos outros no Alfabra-Vector.

| Mudança no Componente (Origem) | Impacta (Destino) | Motivo / Acoplamento |
|--------------------------------|-------------------|----------------------|
| **Schema do Postgres (pgvector)** | `ingestion-worker` (Rust), `java-core` | Ambos escrevem e leem a tabela `document_chunks`. Qualquer alteração na dimensão do embedding quebra a ingestão. |
| **Payload do RabbitMQ (Events)** | `crew-worker` (Python), `java-core`, `frontend` | O Python escreve `ToolCallStarted`/`Finished`, o Java Core consome e insere no banco, e o Frontend exibe via SSE. |
| **Padrão de Pacote ZIP de Agente** | `java-core`, `frontend` | O frontend usa o regex validatório (Issue #110); o backend rejeita zips mal formados ou sem o `.md`. |
| **Contenção do Sandbox (MAX_CHARS)**| `crew-worker` (Python) | Ferramentas pesadas de dados (Pandas) podem falhar se a saída do script truncar acidentalmente o JSON de resposta esperado pelo LLM. |
| **LLM Model Fallback** | `crew-worker` (Python), `embedding-service` (Rust) | Vertex e Google AI Studio usam a mesma API base, mas se um modelo for deprecado, ambos os workers que fazem wrap das credenciais falharão. |
