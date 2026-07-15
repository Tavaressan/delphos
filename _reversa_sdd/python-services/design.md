# Python Services, Design Técnico

> Template do arquivo `design.md`. Foca no COMO a unit é construída, com base no código legado lido.

## Interface

Consumo RabbitMQ:
| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `process_job` | `(ch, method, prop, body)` | `void` | Handler assíncrono do MQ no loop Pika |
| `calculate_sandbox_quota` | `(tenant_id, action, values)` | `str` | Exemplo de Tool injetada dinamicamente |

## Fluxo Principal (CrewAI Adapter Kickoff)
1. Construtor injeta o `agent_id` e recupera do Banco (psycopg2) o Role, Goal e Tag.
2. Método `execute` inicia validando injeção com `validate_and_sanitize`.
3. Dispara Evento de `AgentExecutionStarted`.
4. RAG Interno primário (Chama api embeddings, depois DB).
5. Empacota Tools locais `calculate_floor_specs` ou `route_to_agent` via match na Tag (Ex: `piso`).
6. Carrega Scripts da AST (`_load_custom_tools`).
7. Prepara Prompt final enclausurando RAG em `<knowledge_base_chunks>`.
8. Start da Crew. Retorno emitido.

## Fluxos Alternativos
- **[Worker Mock]**: A variável `CREW_WORKER_MODE=mock` engatilha `MockLLM`, que dá bypass na API do Google devolvendo delays falsos (útil para dev local e testes E2E).

## Dependências
- [Vertex AI (litellm/crewai)], [Integração modelo Foundational Google Flash]
- [Pika], [Driver síncrono AMQP]
- [Psycopg2], [Driver PostgreSQL para busca de Agentes/RAG Sync]

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Uso de Python CrewAI (Agents) | `crewai_adapter.py` import `Crew, Task, Agent` | 🟢 |
| Single-Thread Loop MQ | `prefetch_count=1`, `BlockingConnection` | 🟡 |

## Estado Interno
As execuções no Worker são stateless, bloqueando a thread atual para aguardar a Crew concluir, sendo 1-Job por Worker-Thread, com escabilidade sendo atingida injetando mais contâineres no Kubernetes.

## Riscos e Lacunas
- 🔴 É sabido que python bloqueante (`BlockingConnection`) pode causar queda de heartbeat com a fila se o CrewAI demorar muitos minutos "Thinking", resultando no RabbitMQ derrubar a conexão. (Sugestão de Thread paralela para heartbeats).
