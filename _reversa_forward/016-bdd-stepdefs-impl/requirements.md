# Requirements: BDD real no StepDefinitions — 01-audit C1 e C2

> Identificador: `016-bdd-stepdefs-impl`
> Data: `2026-06-19`
> Pasta da extração reversa: `_reversa_sdd/`
> Approach: `.reversa/approach-draft.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Todos os 40 step definitions em `StepDefinitions.java` são `System.out.println` sem assertions. Esta feature implementa assertions reais para os cenários C1 e C2 de `01-agent-execution-audit.feature` (happy path + casos de falha), configura Testcontainers (`pgvector/pgvector:pg16`) no `CucumberSpringConfiguration` existente, mocka `RabbitTemplate` para inbound/outbound, remove a dependência H2 obsoleta, e marca `@pending` os 6 cenários restantes dos 3 feature files. O resultado é a infraestrutura de BDD funcionando com fidelidade real de banco de dados, pronta para receber cenários futuros sem novo setup.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/sdd.md#1.3-Execução-RAG` | `POST /executions`: cria `AgentExecution` status `REQUESTED` → publica RabbitMQ → status `QUEUED`. Erros de broker retornam 500. | 🟢 |
| `_reversa_sdd/sdd.md#1.3-Roteamento-de-Eventos` | `ToolCallStarted` → insere `ToolCall`; `ToolCallFinished` → status `COMPLETED` + latência. Processado por `AgentExecutionEventListener`. | 🟢 |
| `_reversa_sdd/detective.md#G-01` | `SecurityConfig.anyRequest().permitAll()` — endpoints acessíveis sem autenticação; não impede os testes mas impede cenários de segurança. | 🟢 |
| `_reversa_sdd/detective.md#G-08` | Estados `DISPATCHED`, `WAITING_TOOL`, `CANCELLED` definidos sem implementação — não testar transições para esses estados. | 🟢 |
| `java-core/build.gradle.kts:44` | `cucumber.filter.tags = @__unit__` no task `test` — Cucumber só roda no task `integrationTest` com tag `@integration`. | 🟢 |
| `java-core/build.gradle.kts:31` | `testRuntimeOnly("com.h2database:h2")` — dependência sem uso real; migrations Flyway usam tipos PostgreSQL-específicos (`uuid_generate_v4()`, `vector`, `JSONB`). | 🟢 |
| `_reversa_sdd/architect.md#ADR-R006` | Workers Rust/Python são serviços externos — Java Core não controla consumo de mensagens por eles; cenários que dependem de workers são `@pending`. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| **Desenvolvedor Java Core** | Garantir que `POST /executions` persiste estado correto e publica no broker, com feedback rápido no CI | Executa `./gradlew integrationTest` localmente sem Docker extra; CI roda o mesmo comando sem `services:` adicionais |
| **Revisor de PR** | Confirmar que regressões no fluxo de execução são detectadas antes do merge | Pipeline CI falha se `AgentExecution` não for persistido com status correto ou publish não for chamado |

## 4. Regras de negócio novas ou alteradas

1. **RN-B01:** Após `POST /executions` bem-sucedido, `agent_executions` deve ter exatamente um registro com `status = REQUESTED` para o `executionId` retornado na resposta, antes de qualquer worker processar o job. 🟢
   - Origem: `_reversa_sdd/sdd.md#1.3` passo 4 — status `REQUESTED` criado antes da publicação
   - Tipo: confirmada (regra existente, agora verificada por teste)

2. **RN-B02:** Se `agentId` informado na execução não existir no banco, `POST /executions` deve retornar `404` e NÃO persistir registro em `agent_executions`. 🟡
   - Origem: inferido — comportamento desejável não documentado explicitamente; sdd.md diz apenas `500` para falhas genéricas
   - Tipo: nova (requer lógica de validação em `ExecutionController`)

3. **RN-B03:** Se a publicação RabbitMQ falhar, o registro `AgentExecution` deve ter `status = FAILED` persistido — não pode ficar em `REQUESTED` sem resolução. 🟡
   - Origem: inferido — sdd.md diz `500` para falhas RabbitMQ mas não especifica o status final no banco
   - Tipo: nova (comportamento a ser implementado junto com o step)

4. **RN-B04:** `AgentExecutionEventListener` deve inserir linha em `tool_calls` com `status = COMPLETED` e `duration_ms` preenchido ao processar evento `ToolCallFinished`. 🟢
   - Origem: `_reversa_sdd/sdd.md#1.3-Roteamento-de-Eventos` — `ToolCallFinished` atualiza `ToolCall`
   - Tipo: confirmada

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Configurar Testcontainers (`pgvector/pgvector:pg16`) no `CucumberSpringConfiguration` para subir PostgreSQL real durante `integrationTest` | Must | Flyway executa todas as migrations V1–V5 sem erro na subida do contexto de teste | 🟢 |
| RF-02 | Mockar `RabbitTemplate` com `@MockitoBean` no contexto de teste e desabilitar conexão AMQP ao broker para evitar falha de startup | Must | Contexto Spring sobe sem tentar conectar a RabbitMQ real; `@RabbitListener` beans carregados mas inativos | 🟢 |
| RF-03 | Remover `testRuntimeOnly("com.h2database:h2")` do `build.gradle.kts` | Must | Build compila sem H2; nenhum teste depende de H2 | 🟢 |
| RF-04 | Adicionar Testcontainers ao `build.gradle.kts` (`testcontainers-bom`, `postgresql`, `junit-jupiter`) | Must | `./gradlew integrationTest` sobe container `pgvector/pgvector:pg16` automaticamente sem Docker Compose | 🟢 |
| RF-05 | Implementar assertions em C1 happy path: `POST /executions` → `agent_executions` tem `status = REQUESTED` + `RabbitTemplate.convertAndSend()` chamado com exchange e routingKey corretos | Must | Step `@Então` verifica DB via `JdbcTemplate` ou repository; step `@E` verifica `verify(rabbitTemplate, times(1)).convertAndSend(...)` | 🟢 |
| RF-06 | Adicionar cenário de falha C1a em `01-agent-execution-audit.feature`: `agentId` inexistente → HTTP 404 + zero registros em `agent_executions` | Must | Novo bloco `Cenário` no `.feature`; step `@Então` verifica status code 404 e `COUNT(*) = 0` em `agent_executions` | 🟡 |
| RF-07 | Adicionar cenário de falha C1b em `01-agent-execution-audit.feature`: RabbitMQ indisponível (`doThrow` no mock) → HTTP 500 + `agent_executions.status = FAILED` | Must | Novo bloco `Cenário`; step configura `doThrow(AmqpException)` no mock antes do `POST`; verifica 500 e status `FAILED` no banco | 🟡 |
| RF-08 | Implementar assertions em C2 happy path: `AgentExecutionEventListener` processa `ToolCallFinished` → linha em `tool_calls` com `status = COMPLETED` e `duration_ms > 0` | Must | Step chama diretamente o método listener com evento sintético; verifica via DB real | 🟢 |
| RF-09 | Adicionar cenário de falha C2a em `01-agent-execution-audit.feature`: `executionId` inválido no evento `ToolCallFinished` → exceção tratada + zero registros em `tool_calls` | Should | Novo bloco `Cenário`; step verifica que nenhuma linha foi inserida em `tool_calls` | 🟡 |
| RF-10 | Marcar com `@pending` (Cucumber `@Pending`) os 6 cenários restantes: 01-audit C3, 02-security ×3, 04-workflow ×2 | Must | `./gradlew integrationTest` reporta esses cenários como PENDING, não como FAILED ou ERROR | 🟢 |
| RF-11 | Job `integrationTest` no CI (GitHub Actions) sem `services:` adicionais — Testcontainers gerencia o container internamente no runner | Should | Workflow YAML do CI tem apenas `./gradlew integrationTest` sem bloco `services:` para PostgreSQL | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Performance | `./gradlew integrationTest` completa em menos de 3 minutos localmente (incluindo pull da imagem na primeira execução) | Testcontainers reutiliza imagem em cache após primeiro pull | 🟡 |
| Isolamento | Cada cenário Cucumber deve rodar em transação revertida (`@Transactional` ou `TRUNCATE` entre cenários) para evitar contaminação de estado entre testes | Padrão Testcontainers + Spring Boot Test | 🟢 |
| Manutenibilidade | Novos cenários nos feature files existentes devem encontrar steps correspondentes já implementados ou falhar com mensagem clara "step não implementado" (não `println`) | Base de steps real facilita onboarding de novos cenários | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: C1 happy path — execução registrada e publicada
  Dado que existe um agente válido no banco de dados
  Quando o usuário envia POST /executions com prompt "teste" e o agentId do agente
  Então agent_executions tem um registro com status "REQUESTED" para o executionId retornado
  E RabbitTemplate.convertAndSend() foi chamado exatamente uma vez com o payload correto

Cenário: C1a falha — agente inexistente
  Dado que não existe agente com o ID "00000000-0000-0000-0000-000000000001" no banco
  Quando o usuário envia POST /executions com agentId "00000000-0000-0000-0000-000000000001"
  Então o sistema deve retornar HTTP 404
  E nenhum registro deve existir em agent_executions para essa tentativa

Cenário: C1b falha — RabbitMQ indisponível
  Dado que RabbitTemplate está configurado para lançar AmqpException ao publicar
  Quando o usuário envia POST /executions com prompt "teste"
  Então o sistema deve retornar HTTP 500
  E o registro em agent_executions deve ter status "FAILED"

Cenário: C2 happy path — tool call auditada com latência
  Dado que existe uma AgentExecution com status "STARTED" no banco
  Quando AgentExecutionEventListener processa um evento ToolCallFinished com executionId válido e duration_ms 250
  Então uma linha em tool_calls deve existir com status "COMPLETED"
  E o campo duration_ms deve ser 250

Cenário: C2a falha — executionId inválido no evento
  Dado que não existe AgentExecution com ID "00000000-0000-0000-0000-000000000099"
  Quando AgentExecutionEventListener processa ToolCallFinished com esse executionId
  Então nenhuma linha deve ser inserida em tool_calls
  E nenhuma exceção não-tratada deve propagar
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 — Testcontainers setup | Must | Pré-requisito de tudo; sem ele nenhum cenário tem DB real |
| RF-02 — @MockitoBean RabbitMQ + desabilitar AMQP | Must | Sem isso o contexto Spring falha no startup |
| RF-03 — Remover H2 | Must | Evita falsa sensação de segurança; migrations são incompatíveis |
| RF-04 — Dependência Testcontainers | Must | Build não compila sem ela |
| RF-05 — C1 happy path | Must | Cenário de maior valor; cobre o fluxo principal |
| RF-06 — C1a falha (404) | Must | Valida contract de negócio RN-B02 |
| RF-07 — C1b falha (RabbitMQ down) | Must | Valida RN-B03; usa `doThrow` no mock já configurado |
| RF-08 — C2 happy path | Must | Auditabilidade de tool calls é requisito de governança (US das features files) |
| RF-10 — @pending nos 6 restantes | Must | Evita cenários com `println` passando como verde |
| RF-09 — C2a falha (executionId inválido) | Should | Valida resiliência do listener; menos crítico que happy path |
| RF-11 — CI sem services: | Should | Simplifica CI; Testcontainers já resolve, mas requer ajuste do YAML |

## 9. Esclarecimentos

### Sessão 2026-06-19 (via reversa-future-ideator)

- **Q:** Cenários cross-service (workers externos) devem ter assertions reais ou `@pending`?
- **R:** `@pending` — Java Core não controla crew-worker, rag-worker, workflow-worker.

- **Q:** Infraestrutura de banco: H2, services no CI, ou Testcontainers?
- **R:** Testcontainers (`pgvector/pgvector:pg16`). H2 incompatível com migrations. Testcontainers dispensa `services:` no CI.

- **Q:** Cenários de `02-security` são testáveis com `SecurityConfig.permitAll()` ativo?
- **R:** Não — todos `@pending` até BL-002 (JWT/RBAC) ser implementado.

- **Q:** Casos de falha entram nesta feature?
- **R:** Sim — mesma infra, sem custo adicional de setup. Novos `Cenário` adicionados ao `.feature` file.

## 10. Lacunas

*Nenhuma lacuna pendente. Todas as decisões de design resolvidas pela sessão de approach (`.reversa/approach-draft.md`).*

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-19 | Versão inicial gerada por `/reversa-requirements` com contexto de `.reversa/approach-draft.md` | reversa |
