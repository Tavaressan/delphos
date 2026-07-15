# Java Core, Design Técnico

> Template do arquivo `design.md`. Foca no COMO a unit é construída, com base no código legado lido.

## Interface

Para endpoints HTTP expostos pela API Java:

| Método | Caminho | Entrada | Saída | Status codes |
|--------|---------|---------|-------|--------------|
| POST | `/api/executions` | `agentId (opt), prompt` | `Stream (SseEmitter)` | 200, 400 |
| GET | `/api/executions/:id` | `id: UUID` | `AgentExecutionDTO` | 200, 404 |

## Fluxo Principal (Submit Execution)
1. Request chega em `ExecutionController.submitExecution`.
2. Controller extrai tenant e agentId (null safe).
3. `AgentExecutionService` salva registro inicial (`status = REQUESTED`) via JPA.
4. `EventPublisher` despacha a mensagem JSON contendo UUID, Prompt e Auth Info para `agent.execution.jobs` via AMQP.
5. Serviço de banco marca status como `QUEUED`.
6. Controller instancia e retorna o `SseEmitter`.
7. Assincronamente, `WorkerEventListener` ouve a fila `agent.execution.events` (respostas dos workers Python/Rust).
8. Para cada evento atrelado ao `executionId`, o Listener envia um trigger pelo Emitter mantido em memória, retransmitindo ao Frontend.

## Fluxos Alternativos
- **[Worker Erra]**: Evento recebido via MQ = `AgentExecutionFailed`. Atualiza BD para `FAILED`, emite último SSE e chama `emitter.complete()`.

## Dependências
- [RabbitMQ], [Mensageria AMQP robusta, heartbeats, nack handling]
- [PostgreSQL], [DataSource relacional principal]
- [Spring Data JPA], [Mapeamento objeto-relacional das tabelas]

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| SseEmitter Memory Map | Logística padrão no Spring Web para fluxos async atados ao Request-Thread | 🟡 |
| AgentId Opcional | ADR-001 implementada, suporte no controller para nulos. | 🟢 |

## Estado Interno
Manutenção provável de um Map global (ex: `ConcurrentHashMap<UUID, SseEmitter>`) para correlacionar o Evento AMQP assíncrono com a conexão TCP HTTP aberta pelo client no Controller.

## Riscos e Lacunas
- 🟡 Como é resolvida a limpeza do mapa `SseEmitter` se o worker morrer silenciosamente (Timeout cleanup)? (Resposta: Desconhecido, investigar comportamento real).
- 🟡 Acreditamos que a tabela de `Schedule` dispara um Quartz ou `@Scheduled` em loop no Java.
