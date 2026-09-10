# Núcleo Java, Design Técnico

## Interface

### Endpoints (Expostos)
| Método | Caminho | Entrada | Saída | Status codes |
|--------|---------|---------|-------|--------------|
| GET | `/api/agents` | Parâmetros de página | `Page<Agent>` | 200, 401 |
| POST | `/api/agents/upload` | `multipart/form-data` | `Agent` | 201, 400, 415 |
| POST | `/api/knowledge/upload`| `multipart/form-data` | `Document` | 201, 400 |
| POST | `/api/chat/stream` | `{ prompt, agentId }` | `text/event-stream` | 200, 400 |
| DELETE| `/api/knowledge/:id` | UUID | HTTP 204 | 204, 404 |

### Message Brokers (Eventos RabbitMQ)
| Símbolo (Fila/Exchange) | Tipo Evento | Origem | Ação Observada |
|---------|-----------|---------|------------|
| `agent.execution.events` | Inbound | Worker (Python/Rust) | Extrai payload, processa `ToolCall` ou transiciona estado `AgentExecution` e dispara SSE para o client web. |
| `document.ingestion.jobs` | Outbound| Java Core | Evento disparado pós-commit no JPA para o Rust iniciar a vetorização RAG. |
| `agent.execution.jobs` | Outbound| Java Core | Evento contendo o prompt inicial enviado para fila para ser engolido pelo Python CrewAI Worker. |

## Fluxo Principal (Exemplo: Upload de Agente)
1. Recebe o ZIP em `AgentController`.
2. `AgentService.createAgent` inspeciona o ZIP em memória (tamanho < 20MB, regex `TOOL_NAME_PATTERN` para extensões python e ausência de directory traversal).
3. Salva a entidade `Agent` e os scripts `AgentCustomTool` no Postgres via repositórios JPA.
4. Conecta-se ao SDK MinIO (S3) para realizar upload dos anexos de knowledge do Agente.
5. Injeta no Transactional Observer (após comitar banco relacional) o envio da mensagem ao RabbitMQ para `document.ingestion.jobs`.

## Fluxos Alternativos
- **Erro de Consumo de Fila:** Se a deserialização do JSON ou persistência em `AgentExecutionEventListener` falhar, o core inicia uma transação paralela `REQUIRES_NEW`, grava status = FAILED na execução para não perder visibilidade de erro, e então lança o throw permitindo que o `AmqpRejectAndDontRequeueException` mate a mensagem.

## Dependências
- **Spring Boot 3+ (Java 21+)**: Framework core injetando Data JPA, Web, RabbitMQ (AMQP).
- **PostgreSQL**: Driver JDBC para o banco central.
- **MinIO SDK**: Para integração S3-compatible.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Prevenção atômica de Dirty-Reads enviando filas pós-commit | `TransactionSynchronizationManager` | 🟢 |
| Tratamento de `AmqpRejectAndDontRequeueException` | Listener | 🟢 |
| Sanitização de nomes de arquivo de ZIPs de agentes | `validateDocumentEntryName` | 🟢 |
| Filas Dead-Letter-Queues (DLQ) pré-configuradas no Rabbit | Config Beans Rabbit | 🟢 |

## Estado Interno
O Java não mantém estado de longo prazo em memória. Ele delega para:
- Banco de Dados (Configurações, Logs, Usuários, Status das Tarefas).
- Fila AMQP (Gestão de Retry e Estado assíncrono).

## Observabilidade
- Emite logs internos padronizados e grava `AuditLog` no banco detalhando IP e ações sensíveis feitas por `ROLE_ADMIN` (ex. Exclusão de Bases de Conhecimento).

## Riscos e Lacunas
- 🟢 Sessões HTTP, Limites de Taxa e JWT/RBAC atualmente não usam Redis e não possuem replicação distribuída (stateful no contêiner Java). Foi decidido que a implementação de Redis e validações rígidas de JWT/RBAC ficarão como dívida técnica para um próximo ciclo.
