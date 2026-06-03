# Ciclo de Vida de Execução de Agentes

Este documento especifica a máquina de estados oficial das execuções de agentes distribuídos e os eventos gerados pela **Enterprise Agent Operating Platform**.

---

## 1. Máquina de Estados Operacional

Qualquer tarefa enviada aos workers segue as transições de estados definidas pelo diagrama abaixo:

```
    [REQUESTED] ─► [QUEUED] ─► [DISPATCHED] ─► [STARTED]
                                                 │
  ┌──────────────────────────────────────────────┴──────────────────────────────────────┐
  ▼                                              ▼                                      ▼
[THINKING] ◄───► [TOOL_RUNNING] ◄───► [WAITING_TOOL] ◄───► [RETRIEVAL_RUNNING]
  │
  ├─► [COMPLETED] (sucesso)
  ├─► [FAILED] (erro de execução)
  ├─► [CANCELLED] (cancelamento manual pelo usuário)
  └─► [TIMEOUT] (tempo máximo excedido)
```

---

## 2. Descrição de Estados

- **`REQUESTED`:** Solicitação recebida e validada pela camada Java (`java-core`). Token/quota verificado.
- **`QUEUED`:** Mensagem persistida na fila do RabbitMQ aguardando despacho para um worker livre.
- **`DISPATCHED`:** Mensagem consumida por uma instância ativa de worker (`crew-worker` ou `workflow-worker`).
- **`STARTED`:** O runtime cognitivo inicializa o contexto e carrega as instruções do `AgentPackage`.
- **`THINKING`:** O agente LLM está raciocinando ou gerando o plano de ação (Thought process).
- **`TOOL_RUNNING`:** O worker cognitivo disparou a execução física de uma ferramenta local ou remota (MCP).
- **`WAITING_TOOL`:** O worker cognitivo aguarda a conclusão e retorno de dados de uma API externa da ferramenta.
- **`RETRIEVAL_RUNNING`:** O worker cognitivo disparou uma chamada à base de conhecimento (busca vetorial no Postgres).
- **`COMPLETED`:** Execução finalizada com sucesso. Saída gravada no `Memory Service` e confirmada no RabbitMQ (`ACK`).
- **`FAILED`:** Execução abortada por falhas técnicas (erros de sintaxe, quedas do provedor de LLM).
- **`CANCELLED`:** Operação encerrada sob demanda explícita do usuário (envio de requisição para `/chat/abort`).
- **`TIMEOUT`:** Execução encerrada de forma forçada pelo worker por exceder o limite de tempo (ex: 60 segundos).

---

## 3. Eventos de Ciclo de Vida Orientados a Eventos (RabbitMQ)

O RabbitMQ transaciona eventos estruturados JSON contendo o `correlation_id` e o `execution_id`. Os eventos obrigatórios no backbone de mensageria são:
- `AgentExecutionRequested`: Publicado pelo Java ao enfileirar o job.
- `RetrievalStarted`: Publicado pelo `rag-worker` ao iniciar a varredura vetorial HNSW.
- `RetrievalCompleted`: Publicado pelo `rag-worker` com os scores e chunks relevantes.
- `ToolCallStarted`: Publicado pelo `crew-worker` detalhando o nome da ferramenta e parâmetros de entrada.
- `ToolCallFinished`: Publicado pelo `crew-worker` contendo o resultado da ferramenta e tempo de execução.
- `AgentExecutionFinished`: Publicado pelo worker indicando sucesso e dados finais.
- `AgentExecutionFailed`: Publicado pelo worker com os detalhes do erro para registro em DLQ.
