# Módulo: frontend

## Fluxo de controle
- **Chat e Execução**: O usuário interage via `ChatCanvas`, enviando prompts (`handleSend`). O `useExecution` gerencia o polling de status da execução, enquanto o `useStreamingMessage` gerencia o streaming SSE da resposta.
- **Catálogo de Agentes**: `CatalogClient` carrega agentes via `apiClient.get`, e permite publicar, desativar, editar e excluir (com tratamentos de erro específicos como HTTP 409).
- **Agendamentos**: Gerenciado via `CreateScheduleDialog` e hooks como `useSchedules`, com chamadas para criar e cancelar agendamentos via cron.
- **Base de Conhecimento**: `KnowledgeBasePage` permite o upload de arquivos (`handleFileSelect`) via `FormData`, realizando polling automático (a cada 3s) quando há documentos com status `UPLOADING` ou `PROCESSING`. Busca semântica também está conectada.
- **Tratamento de erros e exceções**: Centralizado na classe `ApiError` em `apiClient.ts`, que captura o timeout ou respostas não-OK e lança exceções padronizadas baseadas em `ErrorResponse`.

## Algoritmos e Lógica
- **Conversão de Timeline**: `timelineToTasks` converte eventos da execução do agente em tarefas consumidas pelo `TaskPanel` (sucesso -> completed, warning -> in_progress, danger -> failed).
- **Validação de Upload de Agente**: `validateAgentZipFileName` assegura que uploads de agentes sejam feitos obrigatoriamente através de pacotes `.zip` contendo os artefatos corretos, rejeitando `.md` avulso (Issue #110).
- **Filtragem e Ordenação**: No `KnowledgeBasePage`, há lógica condicional detalhada de ordenação baseada em `kbSortField` (nome, tamanho, data de criação) combinada com filtro textual de nome.
- **Validação de MCP**: Lógica de verificação de campos vazios e checagem de duplicidade de nomes de servidores MCP (`validateMcpConfigInput` e `addMcpConfig`).

## Estruturas de Dados
- Uso intensivo de interfaces DTO e entidades de domínio padronizadas, extraídas da camada `domain/entities`.
- Referenciar dicionário de dados (`data-dictionary.md`) para campos precisos de `Agent`, `Message`, `AgentExecution`, `Schedule`, `McpServerConfig`.

## Metadados e Configurações
- **Tipos base (Enums equivalentes)**: `DocumentStatus`, `ExecutionStatus`, `AgentStatus`, `MessageRole`.
- **Configurações MCP**: `McpTransport` (`stdio` | `sse`).
- **Modelos**: `LlmModel` (`gemini-1.5-pro` | `gemini-1.5-flash` | `gemini-2.0-flash`) e `EmbeddingModel` (`text-embedding-004` | `text-multilingual-embedding-002`).
- A configuração da URL base para as chamadas de API verifica `NEXT_PUBLIC_BACKEND_URL`, fazendo fallback para `http://localhost:8000` em ambiente de desenvolvimento.

# Módulo: java-core

## Fluxo de controle
- **Criação e Atualização de Agentes**: `AgentService.createAgent` e `AgentService.updateAgentPackage` validam pacotes ZIP de agentes, extraem `systemInstructions`, persistem custom tools (`tools/*.py`), e fazem upload de documentos anexos para o MinIO, publicando em seguida na fila RabbitMQ `document.ingestion.jobs`.
- **Tratamento de Transações**: `AgentService` usa `TransactionSynchronizationManager.registerSynchronization` para garantir que mensagens do RabbitMQ só sejam enviadas após o commit bem-sucedido no banco de dados.
- **Processamento de Eventos de Execução**: `AgentExecutionEventListener` escuta a fila `agent.execution.events` no RabbitMQ, gerenciando a máquina de estados das execuções (STARTED, RETRIEVAL_RUNNING, THINKING, TOOL_RUNNING, COMPLETED, FAILED) e registrando `RetrievalEvent` e `ToolCall`.

## Algoritmos e Lógica
- **Validação de Pacotes**: `parseZip` verifica a estrutura do arquivo ZIP, garantindo a presença de arquivo `.md` (instruções de sistema) na raiz, e limitando tamanho descompactado a 20MB. Ferramentas são identificadas e seus nomes validados por `TOOL_NAME_PATTERN`.
- **Sanitização de Caminhos (Path Traversal)**: `validateDocumentEntryName` evita ataques de directory traversal (`../`) ao extrair nomes de arquivos.
- **Extração de Erros**: O listener de eventos no RabbitMQ unifica mensagens de falha vindas de diferentes workers (Rust usa `error`, Python usa `reason`) no campo unificado `errorMessage`.
- **Prevenção de AmqpRejectAndDontRequeueException**: Em caso de falha de processamento de evento, o listener usa uma transação isolada (`REQUIRES_NEW`) para marcar a execução como FAILED antes de descartar a mensagem na DLQ.

## Estruturas de Dados
- **Agentes**: `Agent`, `AgentCustomTool`.
- **Execução**: `AgentExecution`, `ToolCall`, `RetrievalEvent`, `Message`, `Conversation`.
- **Documentos**: `Document`, `DocumentChunk`.
- Ver `data-dictionary.md` para campos exatos extraídos do domínio JPA (`com.company.core.domain.entities`).

## Metadados e Configurações
- **MinIO**: Bucket padrão configurável `agents-data`.
- **RabbitMQ**: Exchanges e filas como `agent.execution.exchange`, `document.ingestion.jobs`, `agent.execution.events`.
- **Status de Execução**: REQUESTED, QUEUED, STARTED, THINKING, TOOL_RUNNING, RETRIEVAL_RUNNING, COMPLETED, FAILED, CANCELLED, TIMEOUT.

# Módulo: rust-services

O módulo `rust-services` é um workspace Cargo (monorepo Rust) contendo serviços de alto desempenho para tarefas pesadas, integrando-se via RabbitMQ e banco de dados.

## Fluxo de controle
- **ingestion-worker**: Lê da fila `document.ingestion.jobs`. Processa documentos em background (download do MinIO), extrai texto (`document-processing`), faz chunking, requisita embeddings (`embedding-service`) e grava na tabela `document_chunks` (pgvector). Possui um loop independente de *heartbeat reaper* para recuperar e marcar falhas em documentos presos no status `PROCESSING`. Em caso de erro contínuo, jobs são direcionados para uma DLQ (`document.ingestion.jobs.dlq`).
- **rag-worker**: Lê da fila `agent.retrieval.queue`. Executa as buscas vetoriais reais usando HNSW no PostgreSQL (`pgvector`) e invoca LLMs (Vertex AI / Google AI Studio) para resumir informações, gerando eventos no RabbitMQ de término de retrieval.
- **workflow-worker**: Lê da fila `agent.workflow.queue`. Age como um DAG Engine para execução de fluxos determinísticos, enviando de volta eventos de início, sucesso e falha para a fila de eventos principal (`agent.execution.events`).
- **embedding-service**: API HTTP (via Axum) acessada por outros workers. Prove embeddings de texto fazendo chamadas externas para a Vertex AI / Google AI Studio, contando também com uma implementação *mock* para desenvolvimento local (`EMBEDDING_PROVIDER=mock`).

## Algoritmos e Lógica
- **Extração de Texto (document-processing)**: Parsers robustos para PDF (`lopdf`), DOCX (`docx_rs`), Markdown e Texto Puro.
- **Chunking (ingestion-worker)**: O texto é particionado com suporte nativo a overlap, controlável pelas variáveis `CHUNK_SIZE` e `CHUNK_OVERLAP`.
- **Validação de Token e Mocking (embedding-service)**: Sistema resiliente que tenta buscar credentials do GCP Auth e tem fallbacks caso apenas uma API Key exista, além de possibilitar mock determinístico baseado em hash de texto.
- **Transações e Limpeza Atômica (ingestion-worker)**: Ao realizar a ingestão de um documento já indexado, os chunks antigos são removidos transacionalmente antes de inserir os novos para evitar sujeira de dados.

## Estruturas de Dados
- **IngestionJob**: `{ document_id, file_path, tenant_id, file_type }` recebido do RabbitMQ.
- **EmbeddingsRequest / Response**: `{ input, dimensions }` enviado para a API de embeddings; resposta contém array de vetores e log de *usage* de tokens.
- Consultar `data-dictionary.md` para campos exatos extraídos destas sub-estruturas.

## Metadados e Configurações
- **Ingestion**: `HEARTBEAT_TIMEOUT_MINUTES`, `INGESTION_MAX_RETRIES`, `INGESTION_DEV_FALLBACK`.
- **Embeddings**: `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_MAX_RETRIES`.
- **Servidores Axum**: Healthchecks configurados nas portas 8000 para facilitar probes do Kubernetes.
- **RAG Configuration**: Conexão primária com GCP_CHAT_MODEL_ID e fallbacks para GOOGLE_AI_STUDIO_API_KEY.

# Módulo: python-services

## Fluxo de controle
- **Consumo RabbitMQ (`main.py`)**: Consome da fila `agent.execution.jobs`. Roda o job num `contextvars.Context` isolado para evitar vazamento de eventos do CrewAI (issue #391).
- **Adaptador CrewAI (`crewai_adapter.py`)**: Coordena a execução recebendo o payload (prompt, tenant_id, agent_id), inicializa a cadeia LLM, valida segurança (Prompt Injection/tamanho), emite eventos RabbitMQ (Started, Retrieval, ToolCall, Finished) e dispara o `Agent` do CrewAI.
- **Recuperação e RAG**: Reescreve opcionalmente a query (`_rewrite_query`), consome `embedding-service` (via API REST) e executa busca vetorial cosseno no Postgres (`_search_db`).
- **Sandbox de Ferramentas (`executor_core.py`)**: Para execução de scripts e custom tools, isola o script num processo `python3 -I` usando subprocessos (contenção de kernel via diretórios temporários, sem variáveis de ambiente, limite de timeout e MAX_OUTPUT_CHARS).
- **Monitoramento de Saúde**: Caso exceções `StackDepthExceededError` atinjam o `POISON_THRESHOLD`, o worker força encerramento `os._exit(1)` (reiniciado via Docker restart policy) para limpar o state de contexto (issue #391).

## Algoritmos e Lógica
- **LLM Fallback Pattern**: Implementado na classe `FallbackLLM`, tenta chamar primeiro a Google AI Studio e faz fallback automático para Vertex AI em caso de falha (ajustado via issue #389).
- **Query Rewriting (issue #149)**: Passo de reescrita opt-in do prompt via LLM antes de gerar o embedding, com timeout rigoroso para evitar latência.
- **Validação de Ferramentas**: As tools passam por validação AST rigorosa em `sandboxed_script_tool._validate_script` antes de rodarem no `executor_core.py`, bloqueando imports proibidos e dunder methods.

## Estruturas de Dados
- **QuotaValue**: DTO validado via Pydantic para o cálculo de cotas de execução no sandbox.
- **Payloads de Eventos RabbitMQ**: `AgentExecutionStarted`, `RetrievalStarted`, `RetrievalCompleted`, `ToolCallStarted`, `ToolCallFinished`, `AgentExecutionFailed`, seguindo schema estruturado UUID/timestamp/payload.

## Metadados e Configurações
- **Contenção**: Variáveis `CREW_WORKER_HEALTH_FILE` e `CREW_WORKER_POISON_THRESHOLD` (mitigação #391). Flag de CI `ALLOW_UNVALIDATED_SCRIPT` para testes extremos do sandbox sem AST.
- **LLM / Vertex**: Variáveis como `CREW_WORKER_MODE` (real/mock), `VERTEX_AI_API_KEY`, `GCP_PROJECT_ID`, `GOOGLE_AI_STUDIO_API_KEY`, `GOOGLE_AI_STUDIO_CHAT_MODEL_ID`.
- **Query Rewriting**: Opcional via `CREW_QUERY_REWRITING_ENABLED` e `CREW_QUERY_REWRITING_TIMEOUT_SECONDS`.
- **RabbitMQ**: Conexão configurada por `RABBITMQ_HOST`, porta 5672, troca via `agent.execution.exchange` e filas auxiliares.

# Módulo: infrastructure

## Fluxo de controle
- **Provisionamento Web/Proxy**: O Caddy funciona como Gateway API, roteando `/api/*` e `/actuator/*` para o backend `java-core`, com fallback genérico para o `frontend` Next.js na porta 3000.
- **Segurança (UFW)**: O `setup_firewall.sh` automatiza as regras UFW, resetando as antigas e impondo "default deny" na entrada. As conexões liberadas são estritamente em listas brancas (whitelist): SSH via `INFRA_IP_RANGE` e HTTP/HTTPS via `CORP_WHITELIST_RANGE`.
- **Certificados SSL**: O Caddy implementa DNS Challenge embutido via módulo DuckDNS para emitir certificados HTTPS wildcard gratuitos, útil para IPs dinâmicos ou cenários corporativos.
- **Implantação Cloud POC**: O arquivo `render.yaml` descreve a especificação Blueprint no provedor Render para provisionar o serviço web do `rag-worker` conectando com Postgres (CloudAMQP gerenciado manualmente).

## Algoritmos e Lógica
- **Resolução Automática DuckDNS**: O módulo Caddy resolve requisições ACME enviando chamadas API usando a variável de ambiente `DUCKDNS_TOKEN`, eliminando a necessidade de expor a porta 80.
- **Hardening Shell Script**: O script UFW verifica previlégios de root, zera policies antigas, define deny-by-default, e emite avisos importantes sobre as interfaces do Docker que precisam fazer bypass.

## Estruturas de Dados
- Não há definição estrita de estruturas de código/domínio neste módulo (IaC declarativa).

## Metadados e Configurações
- **Caddy**: Usa variáveis como `ACME_CA_URL`, `ACME_EMAIL`, `DOMAIN_NAME`, `DUCKDNS_TOKEN`. O tempo de propagação do DNS é estipulado em 60s com timeout de 5m.
- **Render**: Utiliza as variáveis `DATABASE_URL` (injetada a partir do banco provisionado), `RUST_LOG=info`, `RABBITMQ_URL` (manual sync).
- **Postgres Initialization**: O arquivo `init.sql` carrega as dependências estritas necessárias logo no deploy (`pgvector`, `uuid-ossp`).
