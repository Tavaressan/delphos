# Máquinas de Estado

## 1. Agent Status (Agente)
Entidade: `Agent`

| Status | Gatilho para transição |
|--------|------------------------|
| `DRAFT` | Criação inicial do pacote pelo usuário |
| `IN_REVIEW` | Solicitação de publicação para revisão |
| `PUBLISHED` | Aprovação do agente |
| `ARCHIVED` | Ação de arquivar pelo usuário ou descontinuação |

```mermaid
stateDiagram-v2
    [*] --> DRAFT: create()
    DRAFT --> IN_REVIEW: requestPublish()
    IN_REVIEW --> PUBLISHED: approve()
    IN_REVIEW --> DRAFT: reject()
    PUBLISHED --> DRAFT: unpublish()
    PUBLISHED --> ARCHIVED: archive()
    ARCHIVED --> [*]
```

## 2. Agent Execution Status (Execução)
Entidade: `AgentExecution`

| Status | Gatilho para transição |
|--------|------------------------|
| `REQUESTED` | Requisição feita no Frontend |
| `QUEUED` | Salvo no banco de dados e colocado na fila do RabbitMQ |
| `STARTED` | `Crew-worker` aceita o job e emite evento Started |
| `THINKING` | LLM está formulando a resposta principal |
| `RETRIEVAL_RUNNING` | Disparo de evento `RetrievalStarted` (Busca Semântica no Rust) |
| `TOOL_RUNNING` | Disparo de evento `ToolCallStarted` (Sandbox Python rodando) |
| `COMPLETED` | Tarefa finalizada com sucesso, evento `AgentExecutionCompleted` |
| `FAILED` | Erro emitido pelo worker ou timeout, capturado por `AgentExecutionEventListener` |
| `CANCELLED` | Cancelado via API antes do término |
| `TIMEOUT` | Estourou tempo limite de execução |

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: sendPrompt()
    REQUESTED --> QUEUED: enqueue()
    QUEUED --> STARTED: workerConsume()
    STARTED --> THINKING: startLLM()
    
    THINKING --> RETRIEVAL_RUNNING: needsContext()
    RETRIEVAL_RUNNING --> THINKING: contextLoaded()
    
    THINKING --> TOOL_RUNNING: toolCall()
    TOOL_RUNNING --> THINKING: toolResult()
    
    THINKING --> COMPLETED: finalize()
    THINKING --> FAILED: runtimeError()
    
    STARTED --> FAILED: workerPoisoned()
    
    state "Cancelamento a qualquer momento" as Cancel
    Cancel --> CANCELLED: userAction()
    Cancel --> TIMEOUT: autoTimeout()
```

## 3. Document Status (Documento)
Entidade: `Document`

| Status | Gatilho para transição |
|--------|------------------------|
| `UPLOADING` | Recebimento via multipart-form no Java Core e upload para o MinIO |
| `PROCESSING` | Job enfileirado `document.ingestion.jobs` recebido pelo `ingestion-worker` |
| `INDEXED` | Texto processado, chunking e embeddings inseridos no `pgvector` |
| `FAILED` | Erro crítico no parse, rejeição por Magic Bytes/JavaScript, ou falha pós retries de DLQ |

```mermaid
stateDiagram-v2
    [*] --> UPLOADING: uploadMinio()
    UPLOADING --> PROCESSING: enqueueIngestion()
    PROCESSING --> INDEXED: successVectorize()
    PROCESSING --> PROCESSING: heartbeatReaperRetry()
    PROCESSING --> FAILED: exceedRetriesOrInvalid()
```

## 4. Tool Call Status
Entidade: `ToolCall`

| Status | Gatilho para transição |
|--------|------------------------|
| `STARTED` | Disparo do evento `ToolCallStarted` via RabbitMQ |
| `COMPLETED` | O subprocesso encerrou normalmente (código 0) e emitiu `ToolCallFinished` |
| `FAILED` | O subprocesso falhou (código de erro) ou foi morto (excesso de tempo/uso) |
