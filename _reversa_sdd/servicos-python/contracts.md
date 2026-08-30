# Serviços Python, Contratos e Integrações

Este arquivo consolida os contratos AMQP consumidos e produzidos pelo Crew Worker.
O Python Service não expõe portas HTTP diretas; ele funciona exclusivamente guiado a eventos.

## 1. Filas Consumidas (Inbound)

### `agent.execution.jobs`
- Evento postado pelo **Java Core API Gateway**.
- **Payload Esperado (JobRequest):**
  ```json
  {
    "execution_id": "uuid_execucao",
    "agent_id": "uuid_do_agente",
    "tenant_id": "uuid_do_tenant",
    "prompt": "Texto longo digitado pelo usuário na UI..."
  }
  ```

## 2. Eventos Produzidos (Outbound RabbitMQ)

### `agent.execution.events`
Fila genérica do barramento onde todos os workers emitem notificações granulares de suas ações. 
Os payloads seguem um contrato polimórfico rigoroso validado em `Pydantic` no formato padrão `EventPayload`:

```json
{
  "eventId": "uuid",
  "eventType": "AgentExecutionStarted",
  "executionId": "uuid_execucao",
  "timestamp": "2026-08-26T10:00:00Z",
  "payload": {
    "metadata": "iniciou..."
  }
}
```
Variações do `eventType`:
- `AgentExecutionStarted`
- `AgentExecutionCompleted`
- `AgentExecutionFailed`
- `ToolCallStarted`
- `ToolCallFinished` (com output/erro da tool em JSON dentro de "payload")

### `agent.retrieval.queue` (Disparo Assíncrono para Rust)
Se uma Ferramenta de RAG (Busca Documental Baseada em Vetores) for disparada pelo CrewAI, a execução não roda no Python, o Worker posta a query nesta fila para o `rag-worker` (Rust) processar usando HNSW no PostgreSQL e então devolver no _events_.
- **Payload (`RagRequest`):**
  ```json
  {
    "execution_id": "uuid",
    "tenant_id": "uuid",
    "prompt_text": "Como usar a API de Pagamento?",
    "limits": 5
  }
  ```
