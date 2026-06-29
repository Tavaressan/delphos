# Interface: rabbitmq_delegation

> Tipo de contrato: Fila de Mensageria (RabbitMQ)
> Identificador: `agent.retrieval.delegated`
> Versão: `1.0.0`

Este contrato descreve a comunicação assíncrona entre o `crew-worker` (solicitante) e os microsserviços especialistas (como o `rag-worker`) para delegação e retorno de subtarefas.

## 1. Fila de Solicitação: `agent.retrieval.delegated.jobs`

Fila durável que recebe as solicitações de busca do orquestrador.

### Formato do Payload (JSON Request)
```json
{
  "execution_id": "a6b7e8d2-432a-4db3-987a-8f0a1c2435ab",
  "tenant_id": "f5e4d3c2-b1a0-9e8d-7c6b-5a4f3e2d1c0b",
  "query": "Limites de velocidade do modelo Alpha-4",
  "limit": 5,
  "delegation_depth": 1
}
```

### Detalhe dos Campos
- `execution_id` (UUID, Obrigatório): ID da execução principal do chat.
- `tenant_id` (UUID, Obrigatório): ID do inquilino para isolamento dos dados.
- `query` (string, Obrigatório): O termo de busca textual.
- `limit` (integer, Opcional, default: 5): Quantidade máxima de chunks a recuperar.
- `delegation_depth` (integer, Obrigatório): Nível atual da cadeia de chamadas (usado para evitar loops infinitos).

---

## 2. Fila de Resposta: `agent.retrieval.delegated.events`

Fila durável onde os especialistas publicam o resultado da busca.

### Formato do Payload (JSON Response)
```json
{
  "execution_id": "a6b7e8d2-432a-4db3-987a-8f0a1c2435ab",
  "status": "COMPLETED",
  "results": [
    {
      "chunk_id": "c7d8e9f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
      "text": "O limite de velocidade nominal das escadas rolantes Alfabra modelo Alpha-4 é de 0.5 m/s em modo econômico...",
      "score": 0.9125
    }
  ],
  "error_message": null
}
```

### Detalhe dos Campos
- `execution_id` (UUID, Obrigatório): Correlaciona a resposta com o job original.
- `status` (string, Obrigatório): `"COMPLETED"` ou `"FAILED"`.
- `results` (Array, Obrigatório se status COMPLETED): Lista de chunks encontrados e seus scores.
- `error_message` (string, Opcional): Descrição do erro caso o status seja FAILED.

---

## 3. Comportamentos, Timeouts e Idempotência

### Idempotência
Como a busca vetorial (RAG) é uma operação de leitura de dados (`read-only`), ela é naturalmente idempotente. Execuções duplicadas de mensagens na fila de jobs não geram efeitos colaterais no estado do sistema.

### Timeouts
O solicitante (`crew-worker`) aguardará a resposta na fila por no máximo **4 segundos**. Caso a resposta não chegue nesse intervalo, a tarefa será considerada falha por timeout, e o orquestrador iniciará o fluxo de retentativa ou fallback.

### Erros e Recuperação
Em caso de retorno de status `FAILED` ou timeout persistente após 3 tentativas de retry, o orquestrador aplicará o fallback silencioso para concluir o prompt sem quebra operacional.
