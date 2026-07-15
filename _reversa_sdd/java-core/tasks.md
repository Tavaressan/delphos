# Java Core, Tarefas de Implementação

> Template do arquivo `tasks.md`. Foca em uma sequência de tarefas executáveis para reimplementar a unit a partir do legado, com rastreabilidade ao código original.

## Pré-requisitos
- [ ] Instância PostgreSQL com schema do Flyway aplicado.
- [ ] Conexão RabbitMQ configurada (`spring.rabbitmq.host`).

## Tarefas

- [ ] T-01, Estruturar Entidades JPA e Repositórios
  - Origem no legado: Repositórios Spring Data (inferido da arquitetura)
  - Critério de pronto: Interfaces Repository para Agent, AgentExecution, Schedule e UserSession com TenantId Filter.
  - Confiança: 🟢

- [ ] T-02, Controllers REST (`ExecutionController`)
  - Origem no legado: `java-core/src/main/java/.../ExecutionController.java`
  - Critério de pronto: Endpoint `POST /api/executions` mapeando DTOs (aceitando `agentId` nulo) e retornando `SseEmitter`.
  - Confiança: 🟢

- [ ] T-03, AMQP Publisher e Listener
  - Origem no legado: Integração assíncrona cross-container (visto em testes de CI)
  - Critério de pronto: Beans `RabbitTemplate` para publicar na exchange, e `@RabbitListener` em `agent.execution.events` lendo JSON (Jackson).
  - Confiança: 🟢

- [ ] T-04, Correlation Map SSE
  - Origem no legado: Padrão Spring SSE streaming
  - Critério de pronto: Listener ao receber evento, localiza o Emitter e invoca `.send()` com o payload recebido do worker.
  - Confiança: 🟡

## Tarefas de Teste
- [ ] TT-01, (Testcontainers BDD) - Simular uma mensagem RabbitMQ entrante e validar se Emitter escreve os bytes corretos.
- [ ] TT-02, Validar erro (400) se body do POST for inválido (faltar prompt).

## Ordem Sugerida
1. JPA (T-01) -> Base sólida do banco.
2. DTOs e RabbitMQ (T-03) -> Contratos de borda.
3. Controller (T-02 e T-04) -> Lógica de união.

## Lacunas Pendentes (🔴)
Falta clareza da implementação exata de Auth (se via Spring Security JwtFilter no Java). O desenvolvedor deverá seguir o padrão local.
