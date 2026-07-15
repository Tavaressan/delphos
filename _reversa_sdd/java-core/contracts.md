# Contratos (Contracts)

> Opcional: Descreve formatos de interface do módulo.

## Contrato AMQP / RabbitMQ

Para a Fila de Envio (Producer):
**Exchange**: `agent.execution.exchange` (Direct)
**Routing Key**: `agent.execution.requested` / **Queue**: `agent.execution.jobs`

**Payload JSON Base:**
```json
{
  "execution_id": "uuid-da-execucao",
  "tenant_id": "id-do-cliente",
  "prompt_final": "O que a documentação diz sobre elevadores?",
  "agent_id": "uuid-do-agente-ou-null",
  "manifest_config": "yaml_config_opcional"
}
```

Para a Fila de Retorno (Consumer):
**Exchange**: `agent.execution.exchange` (Direct)
**Routing Key**: `agent.execution.events` / **Queue**: `agent.execution.events`

**Eventos JSON Esperados (recebidos do Python/Crew-Worker):**
```json
{
  "eventId": "uuid-do-evento",
  "eventType": "AgentExecutionFinished",
  "executionId": "uuid-da-execucao",
  "timestamp": "2026-07-15T12:00:00Z",
  "payload": {
    "outputResult": "A resposta do LLM final...",
    "tokensConsumed": 850
  }
}
```
*Eventos mapeados no listener Java: `AgentExecutionStarted`, `RetrievalStarted`, `RetrievalCompleted`, `ToolCallStarted`, `ToolCallFinished`, `AgentExecutionFinished`, `AgentExecutionFailed`.*
