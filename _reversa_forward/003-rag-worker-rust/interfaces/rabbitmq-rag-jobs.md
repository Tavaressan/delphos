# Interface de Contrato: RabbitMQ RAG Jobs

> Identificador: `003-rag-worker-rust`
> Contrato: `rabbitmq-rag-jobs`
> Tipo: Fila AMQP

Este documento detalha o formato do payload e a especificação de comunicação assíncrona do `rag-worker` com o broker RabbitMQ.

## 1. Topologia de Rede e Filas

*   **Exchange:** `agent.execution.exchange`
*   **Fila de Consumo:** `agent.retrieval.queue`
*   **Routing Key de Entrada (Consumo):** `agent.retrieval.requested`
*   **Fila de Destino de Eventos (Publicação):** `agent.execution.events` (exchange padrão ou direct)
*   **Routing Key de Saída (Publicação):** `agent.execution.event`

## 2. Contratos de Mensagens (JSON)

### 2.1. Payload de Entrada (`agent.retrieval.requested`)

Enviado pelo `java-core` ou orquestradores de fluxo para solicitar uma busca contextualizada.

```json
{
  "execution_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99",
  "tenant_id": "893c52e4-e0c1-456c-bb9b-b0b230230200",
  "query": "Qual o prazo de validade das chaves de segurança?"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `execution_id` | UUID | Identificador único de execução da tarefa do agente. |
| `tenant_id` | UUID | ID do Tenant para selecionar o workspace isolado no AnythingLLM. |
| `query` | String | Pergunta ou texto de busca enviado pelo usuário. |

### 2.2. Evento `RetrievalStarted`

Publicado imediatamente ao iniciar o processamento da tarefa pelo `rag-worker`.

```json
{
  "event_type": "RetrievalStarted",
  "execution_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99",
  "timestamp": "2026-06-03T14:32:00Z"
}
```

### 2.3. Evento `RetrievalCompleted`

Publicado em caso de sucesso na consulta ao AnythingLLM, enviando a resposta textual e os metadados dos chunks de contexto recuperados.

```json
{
  "event_type": "RetrievalCompleted",
  "execution_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99",
  "timestamp": "2026-06-03T14:32:05Z",
  "payload": {
    "response": "O prazo de validade das chaves de segurança é de 12 meses, conforme a política corporativa de TI...",
    "chunks": [
      {
        "id": 1422,
        "content": "Validade de Chaves: Todas as chaves corporativas e segredos de produção devem ser rotacionados anualmente (12 meses).",
        "score": 0.942
      }
    ]
  }
}
```
