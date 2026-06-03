# Serviços Rust, Design Técnico

## Interface

### Endpoints Internos de Microsserviços

| Microsserviço | Método | Caminho | Entrada | Saída | Observação |
|---|---|---|---|---|---|
| `document-processing` | GET | `/healthz` | N/A | `"OK"` (Text) | Endpoint de Health Check |
| `embedding-service` | GET | `/healthz` | N/A | `"OK"` (Text) | Endpoint de Health Check |
| `document-processing` | POST | `/process` | `bytes: Multipart` | `JSON (Chunks)` | Extrai chunks de arquivo | 🟢 CONFIRMADO (Confirmado pelo usuário) |
| `embedding-service` | POST | `/embeddings` | `JSON (Texts)` | `JSON (Vectors)` | Gera os embeddings (dimensão parametrizável) | 🟢 CONFIRMADO (Confirmado pelo usuário) |

---

## Fluxo Principal

### 1. Inicialização de Microsserviços Axum
1. O runtime `tokio::main` inicia.
2. Cria um roteador Axum mapeando o endpoint GET `/healthz` para a função de retorno de texto `"OK"`.
3. Inicia um socket TCP listener na porta `0.0.0.0:8000`.
4. Serve as requisições recebidas utilizando `axum::serve`.

### 2. Ciclo de Heartbeat do Ingestion Worker
1. Imprime `"Ingestion Worker starting..."`.
2. Entra em um loop `loop` infinito.
3. Pausa a thread de execução assincronamente por 60 segundos com `tokio::time::sleep`.
4. Executa a impressão no terminal `"Ingestion Worker heartbeat"`.
5. Verifica tarefas pendentes no banco e as distribui aos microsserviços.

---

## Dependências
* **Tokio:** Runtime de IO assíncrono para Rust.
* **Axum:** Framework web de alto desempenho para Rust integrado ao ecossistema Tokio.
* **Shared Crate:** Biblioteca local contendo utilitários comuns (`shared/src/lib.rs`).

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Porta Interna 8000 | `document-processing/src/main.rs:7` e `embedding-service/src/main.rs:7` | 🟢 CONFIRMADO |
| Sleep Assíncrono com Tokio | `ingestion-worker/src/main.rs:5` | 🟢 CONFIRMADO |
| Lib compartilhada interna | Cargo workspace referenciando dependência `shared` | 🟢 CONFIRMADO |
| Parsing Documental Multiformato | Estratégia homologada pelo usuário (lopdf, pdf-extract, tesseract, docx-rs, scraper, pulldown-cmark) | 🟢 CONFIRMADO (Confirmado pelo usuário) |
| Provedor Oficial de Embeddings | Google Vertex AI (`text-embedding-005` ou `gemini-embedding-001`) com padrão Provider Abstraction | 🟢 CONFIRMADO (Confirmado pelo usuário) |

---

## Detalhamento Técnico dos Serviços

### Document Processing Service (Rust)
* **Responsabilidades:** Ingestão de arquivos brutos (PDF textual, PDF digitalizado/imagens com OCR via Tesseract, DOCX, HTML, Markdown), extração de metadados estruturados e execução de algoritmos de chunking configurável.
* **Configurações do Chunking:**
  * `CHUNK_SIZE`: Tamanho em caracteres (ex: 1000).
  * `CHUNK_OVERLAP`: Sobreposição de caracteres (ex: 200).
  * `OCR_ENABLED`: Flag booleano (`true`/`false`).
  * `OCR_LANG`: Idioma para reconhecimento de caracteres (ex: `por+eng`).
  * `MAX_DOCUMENT_SIZE_MB`: Limite para tamanho do arquivo enviado (ex: 50).
* **Estratégias de Chunking:** Implementação da trait `ChunkStrategy` com as variações `SentenceChunker`, `TokenChunker` e futuramente `SemanticChunker`.

### Embedding Service (Rust)
* **Responsabilidades:** Traduzir blocos textuais enviados pelo worker em vetores de dimensionalidade parametrizável (de acordo com o modelo configurado) compatíveis com RAG.
* **Abstração (Provider Pattern):** Uso da trait `EmbeddingProvider` permitindo multiplos provedores (`VertexProvider` como padrão inicial, `OpenAIProvider`, `OllamaProvider`, `GeminiDirectProvider`).
* **Configurações e Variáveis de Ambiente:**
  * `EMBEDDING_PROVIDER`: Definido inicialmente como `vertex`.
  * `VERTEX_PROJECT_ID`: ID do projeto Google Cloud.
  * `VERTEX_LOCATION`: Região de localização do recurso GCP (ex: `us-central1`).
  * `VERTEX_MODEL`: Nome do modelo (padrão: `text-embedding-005` ou `gemini-embedding-001`).
  * `GOOGLE_APPLICATION_CREDENTIALS`: Caminho para o JSON de Service Account (`/secrets/service-account.json`).
  * `EMBEDDING_TIMEOUT`: Tempo de timeout HTTP (padrão: 30s).
  * `EMBEDDING_BATCH_SIZE`: Tamanho de lote para requisições em lote (padrão: 16).

---

## Riscos e Lacunas
*(Nenhuma lacuna crítica pendente neste módulo)*
