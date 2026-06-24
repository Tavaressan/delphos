# Actions: BDD real no StepDefinitions — 01-audit C1 e C2

> Identificador: `016-bdd-stepdefs-impl`
> Data: `2026-06-19`
> Roadmap: `_reversa_forward/016-bdd-stepdefs-impl/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 15 |
| Paralelizáveis (`[//]`) | 7 |
| Maior cadeia de dependência | 7 (T001→T003→T004→T008→T009→T014→T015) |

---

## Fase 1 — Preparação (build + config)

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Em `build.gradle.kts`: remover `testRuntimeOnly("com.h2database:h2")`; adicionar `testImplementation(platform("org.testcontainers:testcontainers-bom:1.20.4"))`, `testImplementation("org.testcontainers:postgresql")`, `testImplementation("org.testcontainers:junit-jupiter")` | — | `[//]` | `java-core/build.gradle.kts` | 🟢 | `[ ]` |
| T002 | Criar `src/test/resources/application-test.properties` com `spring.amqp.listener.simple.auto-startup=false` para impedir que `@RabbitListener` tente conectar ao broker no startup do teste | — | `[//]` | `java-core/src/test/resources/application-test.properties` | 🟢 | `[ ]` |

---

## Fase 2 — Infraestrutura de teste

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Atualizar `CucumberSpringConfiguration.java`: adicionar `@Testcontainers`; declarar `@Container static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg16")`; adicionar método `@DynamicPropertySource static void props(DynamicPropertyRegistry r)` que seta `spring.datasource.url`, `spring.datasource.username`, `spring.datasource.password` a partir do container | T001, T002 | `[-]` | `java-core/src/test/java/com/company/core/CucumberSpringConfiguration.java` | 🟢 | `[ ]` |
| T004 | Executar `./gradlew integrationTest` (sem nenhum step implementado ainda) e confirmar que: (a) contexto Spring sobe sem erro de conexão RabbitMQ; (b) Flyway executa V1–V5 sem erro no Testcontainers; (c) Cucumber reporta todos os cenários como UNDEFINED ou PENDING (não ERROR) | T003 | `[-]` | — | 🟢 | `[ ]` |

---

## Fase 3 — Feature files

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Atualizar `01-agent-execution-audit.feature`: (1) adicionar tag `@integration` na linha `Funcionalidade:`; (2) adicionar `@pending` antes do `Cenário:` de C3 (retrieval events); (3) adicionar três novos blocos `Cenário` ao final: C1a (agente inexistente → HTTP 404 + zero linhas em `agent_executions`), C1b (RabbitMQ indisponível via mock → HTTP 500 + `status = FAILED` no banco), C2a (listener recebe `ToolCallFinished` com `executionId` inválido → zero linhas em `tool_calls` sem exceção não-tratada) | T004 | `[//]` | `java-core/src/test/resources/features/01-agent-execution-audit.feature` | 🟢 | `[ ]` |
| T006 | Adicionar tag `@pending` antes de cada `Cenário:` nos 3 cenários de `02-security-and-governance.feature` | T004 | `[//]` | `java-core/src/test/resources/features/02-security-and-governance.feature` | 🟢 | `[ ]` |
| T007 | Adicionar tag `@pending` antes de cada `Cenário:` nos 2 cenários de `04-workflow-execution.feature` | T004 | `[//]` | `java-core/src/test/resources/features/04-workflow-execution.feature` | 🟢 | `[ ]` |

---

## Fase 4 — Núcleo (step definitions)

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Em `StepDefinitions.java`: (1) adicionar `@Autowired TestRestTemplate restTemplate`, `@Autowired JdbcTemplate jdbcTemplate`, `@MockitoBean RabbitTemplate rabbitTemplate`; (2) implementar C1 happy path — step `@Quando("o usuário envia uma tarefa…")` faz `POST /executions` com `{ prompt, agentId }`; step `@Então("o sistema deve registrar…REQUESTED")` conta linhas em `agent_executions` com `status='REQUESTED'` via `jdbcTemplate`; step `@E("uma mensagem contendo o Trace Context…")` chama `verify(rabbitTemplate, times(1)).convertAndSend(anyString(), anyString(), any())` | T004 | `[-]` | `java-core/src/test/java/com/company/core/StepDefinitions.java` | 🟢 | `[ ]` |
| T009 | ~~Código de produção já implementado~~ — guard 404 adicionado em `ExecutionController.java` linhas 79–86: `agentRepository.findById(...).orElse(null)` seguido de early return `ResponseEntity.status(404)` quando agent é null. Implementar steps de C1a em `StepDefinitions.java`: step `@Dado("que não existe agente…")` usa UUID inexistente; step `@Então("o sistema deve retornar HTTP 404")` verifica status code; step `@E("nenhum registro…")` conta `COUNT(*) = 0` em `agent_executions` via jdbcTemplate | T008 | `[//]` | `java-core/src/test/java/com/company/core/StepDefinitions.java` | 🟢 | `[ ]` |
| T010 | ~~Código de produção já implementado~~ — inner try/catch `AmqpException` adicionado em `ExecutionController.java` após linha 121: persiste `status = FAILED` + `errorMessage` e retorna 500 com `executionId`. Implementar steps de C1b em `StepDefinitions.java`: step `@Dado("que RabbitTemplate…lançar AmqpException")` configura `doThrow(new AmqpException("down")).when(rabbitTemplate).convertAndSend(anyString(), anyString(), any())`; steps `@Então` verificam HTTP 500 e `status = FAILED` via jdbcTemplate; step de teardown chama `reset(rabbitTemplate)` | T008 | `[//]` | `java-core/src/test/java/com/company/core/StepDefinitions.java` | 🟢 | `[ ]` |
| T011 | Em `StepDefinitions.java`: adicionar `@Autowired AgentExecutionEventListener listener`; implementar C2 happy path — step `@Dado("que o agente…inicia a execução…")` insere `AgentExecution` com `status = STARTED` via `jdbcTemplate` (ou `executionRepository`); step `@Quando("o agente dispara a ferramenta…")` constrói evento `ToolCallFinished` sintético com `executionId`, `toolName`, `durationMs = 250` e chama `listener.handleToolCallFinished(event)` diretamente; steps `@Então` verificam linha em `tool_calls` com `status = COMPLETED` e `duration_ms = 250` via `jdbcTemplate` | T004 | `[//]` | `java-core/src/test/java/com/company/core/StepDefinitions.java` | 🟢 | `[ ]` |
| T012 | Implementar steps de C2a — step `@Dado("que não existe AgentExecution…")` garante ausência do UUID de teste; step `@Quando("AgentExecutionEventListener processa ToolCallFinished…")` chama `listener.handleToolCallFinished(eventoComIdInválido)` dentro de bloco `try/catch` para capturar exceção esperada; steps `@Então` verificam `COUNT(*) = 0` em `tool_calls` e que nenhuma exceção não-tratada se propagou | T011 | `[-]` | `java-core/src/test/java/com/company/core/StepDefinitions.java` | 🟡 | `[ ]` |

---

## Fase 5 — Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T013 | Adicionar job `java-integration` em `ci.yml` após `java-check`: `runs-on: ubuntu-latest`; steps de checkout + setup JDK 21 + `./gradlew integrationTest` com `timeout-minutes: 10`; sem bloco `services:` — Testcontainers gerencia o container internamente | T004 | `[//]` | `.github/workflows/ci.yml` | 🟢 | `[ ]` |
| T014 | Executar `./gradlew integrationTest` com todos os steps implementados (T005–T013) e validar todos os critérios do `roadmap.md#10`: 5 cenários verdes, 6 `PENDING`, sem `ERROR` ou `FAILED` | T005, T006, T007, T008, T009, T010, T011, T012, T013 | `[-]` | — | 🟢 | `[ ]` |

---

## Fase 6 — Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T015 | Executar `./gradlew test` e confirmar regressão zero nos unit tests existentes (`AgentControllerTest`, `AgentRepositoryTest`, `RoleRepositoryTest`) — as mudanças em `build.gradle.kts` e `StepDefinitions.java` não devem afetar o task `test` | T014 | `[-]` | — | 🟢 | `[ ]` |

---

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgirem durante a execução.
Não use isso para corrigir ações — edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-19 | Versão inicial gerada por `/reversa-to-do` | reversa |
