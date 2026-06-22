# Approach Draft — Implementação de BDD real no StepDefinitions.java

> Gerado por reversa-future-ideator em 2026-06-19T05:00:00Z
> Feature: Implementação de BDD real no StepDefinitions.java
> Projeto: Alfabra-Vector

## Abordagem escolhida

Testcontainers (`pgvector/pgvector:pg16`) para PostgreSQL e `@MockitoBean` para `RabbitTemplate` no `CucumberSpringConfiguration` existente (`@SpringBootTest(RANDOM_PORT)`). Assertions reais implementadas em 01-audit C1 e C2 (happy path + casos de falha). Novos blocos `Cenário` de falha adicionados ao `01-agent-execution-audit.feature`. Os 6 cenários restantes marcados `@pending`. H2 removido do `build.gradle.kts`. CI sem `services:` adicionais — Testcontainers gerencia o container internamente no runner `ubuntu-latest`.

## Alternativas descartadas

| Alternativa | Motivo de descarte |
|-------------|-------------------|
| H2 + Flyway desabilitado | Migrations usam `uuid_generate_v4()`, `vector`, `JSONB` — incompatíveis com H2. Projeto já padronizou PostgreSQL no CI. |
| `services:` no job `integrationTest` do CI | Desnecessário — Testcontainers sobe o container internamente; `ubuntu-latest` tem Docker disponível. |
| Assertions em cenários cross-service | Java Core não controla workers externos (crew-worker Python, rag-worker Rust, workflow-worker Rust). |
| `@MockitoBean` para repositórios JPA | Baixa fidelidade — não valida schema Flyway, FK constraints nem comportamento JPA real. |
| Adiar casos de falha para iteração futura | Infra Testcontainers + `@MockitoBean` já suporta `doThrow()` e violações de FK sem custo adicional de setup. |

## Decisões antecipadas

Estas decisões foram tomadas durante a discussão e NÃO devem virar `[DÚVIDA]` no `requirements.md`:

1. Infraestrutura → Testcontainers (`pgvector/pgvector:pg16`) + `@MockitoBean` para `RabbitTemplate`
2. Cenários cross-service → `@pending` (01-audit C3, todos de 04-workflow)
3. Cenários de segurança → `@pending` até BL-002 (JWT/RBAC) ser implementado
4. MVP de assertions → 01-audit C1 e C2 (happy path + falhas)
5. Casos de falha → incluídos nesta feature com novos `Cenário` no `.feature` file
6. `testRuntimeOnly("com.h2database:h2")` → remover do `build.gradle.kts`
7. CI `integrationTest` job → sem `services:` adicionais no YAML

## Restrições do legado

| Restrição | Fonte nos artefatos |
|-----------|---------------------|
| `SecurityConfig.anyRequest().permitAll()` ativo — cenários de segurança não testáveis até BL-002 | `_reversa_sdd/detective.md#G-01` |
| `cucumber.filter.tags = @__unit__` no task `test` — nenhum cenário Cucumber roda no CI sem tag explícita | `java-core/build.gradle.kts:44` |
| Migrations Flyway usam tipos PostgreSQL-específicos (`uuid_generate_v4()`, `vector`, `JSONB`) | `_reversa_sdd/detective.md#ADR-R004` + migrations V1–V5 |
| G-08: estados `DISPATCHED`, `WAITING_TOOL`, `CANCELLED` definidos sem implementação — não testar transições para esses estados | `_reversa_sdd/detective.md#G-08` |
| `workflow-worker` e `rag-worker` são serviços Rust externos — comportamento não verificável a partir do Java Core | `_reversa_sdd/architect.md#ADR-R006` |

## Escopo desta iteração

| Cenário | MoSCoW | Justificativa |
|---------|--------|---------------|
| 01-audit C1 happy path — `REQUESTED` + publish RabbitMQ | Must | Core value do sistema; path mais crítico |
| 01-audit C1 falha — agent inexistente → 404 | Must | Erro de negócio mais provável em produção |
| 01-audit C1 falha — RabbitMQ indisponível → `FAILED` no DB | Must | Valida que falha de infra não deixa execução em limbo |
| 01-audit C2 happy path — `tool_calls` + latência persistida | Must | Auditabilidade de tool calls é requisito de governança |
| 01-audit C2 falha — execution ID inválido → erro tratado | Should | Valida FK constraint e response de erro |
| 01-audit C3, 02-security ×3, 04-workflow ×2 | Could | `@pending` — implementar quando happy paths correspondentes saírem de pending |

## Descrição refinada para /reversa-requirements

```
Implementar assertions reais nos cenários C1 e C2 de
01-agent-execution-audit.feature com Testcontainers
(pgvector/pgvector:pg16) para PostgreSQL e @MockitoBean para
RabbitTemplate no CucumberSpringConfiguration existente. C1 happy
path: agent_executions persiste REQUESTED e
RabbitTemplate.convertAndSend() é chamado com payload correto. C1
falhas (novos Cenários no .feature): agente inexistente → 404;
RabbitMQ indisponível via doThrow() → execução persiste FAILED. C2
happy path: tool_calls grava COMPLETED com latência em
milissegundos. C2 falha (novo Cenário): execution ID inválido → erro
tratado. Marcar @pending os 6 cenários restantes (01-audit C3,
02-security ×3, 04-workflow ×2). Remover
testRuntimeOnly("com.h2database:h2") e adicionar Testcontainers ao
build.gradle.kts. Job integrationTest no CI não requer services:
adicionais — Testcontainers gerencia o container internamente.
```

---
Discussão conduzida por reversa-future-ideator | 2026-06-19T05:00:00Z
