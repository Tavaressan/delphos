# Roadmap: BDD real no StepDefinitions — 01-audit C1 e C2

> Identificador: `016-bdd-stepdefs-impl`
> Data: `2026-06-19`
> Requirements: `_reversa_forward/016-bdd-stepdefs-impl/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Quatro frentes paralelas após a configuração de infra:

1. **Build** — remove H2, adiciona Testcontainers BOM + módulos `postgresql` e `junit-jupiter`
2. **Infraestrutura de teste** — `CucumberSpringConfiguration` recebe `@Testcontainers` + `@Container` para PostgreSQL; `application-test.properties` desabilita auto-startup dos `@RabbitListener`; `@MockitoBean RabbitTemplate` mocka o outbound AMQP
3. **Feature files** — `01-agent-execution-audit.feature` recebe tag `@integration`, novos `Cenário` de falha (C1a, C1b, C2a) e `@pending` em C3; `02-security` e `04-workflow` recebem `@pending` em todos os cenários
4. **Step definitions** — `StepDefinitions.java` substitui `println` por assertions reais em C1 (happy + falhas) e C2 (happy + falha); injeta `TestRestTemplate`, `JdbcTemplate` e `AgentExecutionEventListener`
5. **CI** — novo job `java-integration` em `ci.yml` executando `./gradlew integrationTest` sem `services:` adicionais

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Fidelidade de teste | Testcontainers com imagem real `pgvector/pgvector:pg16` — Flyway roda idêntico à produção | respeita |
| Isolamento entre cenários | Cada cenário limpa estado via `@Transactional` com rollback ou truncate no `@Before` Cucumber | respeita |
| Sem infra desnecessária | `@RabbitListener` desabilitado em teste; workers externos não são simulados — comportamento cross-service vira `@pending` | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Testcontainers `pgvector/pgvector:pg16` para PostgreSQL | Flyway usa `uuid_generate_v4()`, `vector`, `JSONB` — incompatíveis com H2; mesma imagem já usada no CI | H2 (incompatível), `services:` no CI (desnecessário com Testcontainers) | 🟢 |
| D-02 | `spring.amqp.listener.simple.auto-startup=false` + `@MockitoBean RabbitTemplate` | Impede `@RabbitListener` de tentar conectar no startup; mocka outbound sem excluir toda a auto-configuração AMQP | Excluir `RabbitAutoConfiguration` (remove beans úteis para testes futuros); Testcontainers RabbitMQ (não necessário para estas assertions) | 🟢 |
| D-03 | `AgentExecutionEventListener` chamado diretamente nos steps de C2 | Testa o comportamento do listener sem broker real; válido pois o método é um bean Spring injetável | Publicar mensagem real via RabbitMQ embedded (complexidade desnecessária) | 🟢 |
| D-04 | Novos `Cenário` de falha adicionados ao `.feature` file | Casos de falha usam a mesma infra já configurada — sem overhead adicional de setup | Iterar em PR separado (adiaria cobertura de paths críticos) | 🟢 |
| D-05 | Remoção de `testRuntimeOnly("com.h2database:h2")` | Dependência sem uso real; presença cria falsa sensação de segurança | Manter sem uso (dependência morta gera ruído) | 🟢 |

## 4. Premissas

| Premissa | Origem | Risco se errada |
|----------|--------|-----------------|
| `ubuntu-latest` no GitHub Actions tem Docker disponível para Testcontainers | Padrão documentado do GitHub Actions | Baixo — é garantido para runners `ubuntu-latest` |
| `AgentExecutionEventListener` é um `@Component` Spring injetável nos steps | `sdd.md#1.3` — bean registrado no contexto Spring Boot | Baixo — verificar se é `@Service` ou `@Component` antes de injetar |
| `ExecutionController.POST /executions` retorna 404 quando `agentId` não existe | Comportamento desejado definido em RN-B02 — pode não estar implementado | Médio — se o controller não valida `agentId`, o step C1a vai falhar e exigir implementação do guard |
| `AgentExecution` com `status = FAILED` é persistido quando `RabbitTemplate` lança exceção | RN-B03 — comportamento a definir | Médio — pode exigir `try/catch` no `ExecutionController` com rollback controlado |

## 5. Delta arquitetural

| Componente | Arquivo | Tipo de mudança | Resumo |
|------------|---------|-----------------|--------|
| Build | `java-core/build.gradle.kts` | alterado | Remove H2; adiciona Testcontainers BOM + módulos |
| Teste config | `java-core/src/test/resources/application-test.properties` | adicionado | `spring.amqp.listener.simple.auto-startup=false`; datasource aponta para Testcontainers via `@DynamicPropertySource` |
| Cucumber config | `java-core/src/test/java/.../CucumberSpringConfiguration.java` | alterado | Adiciona `@Testcontainers`, `@Container static PostgreSQLContainer<?>`, `@DynamicPropertySource` |
| Feature file | `java-core/src/test/resources/features/01-agent-execution-audit.feature` | alterado | Tag `@integration`; novos cenários C1a, C1b, C2a; `@pending` em C3 |
| Feature file | `java-core/src/test/resources/features/02-security-and-governance.feature` | alterado | `@pending` em todos os cenários |
| Feature file | `java-core/src/test/resources/features/04-workflow-execution.feature` | alterado | `@pending` em todos os cenários |
| Step defs | `java-core/src/test/java/.../StepDefinitions.java` | alterado | Injeta `TestRestTemplate`, `JdbcTemplate`, `@MockitoBean RabbitTemplate`, `AgentExecutionEventListener`; substitui `println` por assertions reais |
| CI | `.github/workflows/ci.yml` | alterado | Novo job `java-integration` com `./gradlew integrationTest` |

## 6. Delta no modelo de dados

Nenhuma migration nova. Esta feature usa o schema existente (V1–V5) lido pelo Testcontainers + Flyway no startup do teste.

## 7. Delta de contratos externos

Nenhuma alteração em contratos de API ou filas. Esta feature é exclusivamente de teste.

## 8. Plano de migração

Não aplicável — sem alterações de dados ou schema.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| `ExecutionController` não valida `agentId` → step C1a não consegue retornar 404 sem implementação | Médio — requer código de produção não previsto inicialmente | Alta — `agentId` é opcional no sdd.md, sem validação óbvia | Ao implementar T008, verificar se o controller valida; se não, adicionar guard `agentRepository.findById(agentId).orElseThrow(() -> new ResponseStatusException(404))` |
| `status = FAILED` não é persistido na exceção de RabbitMQ | Médio — step C1b falha, requer tratamento de exceção no controller | Alta — atual implementação provavelmente propaga a exceção sem persistir status | Ao implementar T010, adicionar `try/catch AmqpException` no controller com update do status para `FAILED` |
| Testcontainers demora > 60s no primeiro pull em CI (cache frio) | Baixo — CI timeout | Baixa | Adicionar `timeout-minutes: 10` no job `java-integration` do CI |
| `@DynamicPropertySource` conflita com propriedades existentes de datasource | Baixo | Baixa | Usar `@DynamicPropertySource` com overrideExistingValues se necessário |

## 10. Critério de pronto

- [ ] `./gradlew integrationTest` verde localmente com os 5 cenários implementados
- [ ] C1 happy path: `agent_executions` tem `status = REQUESTED`; `verify(rabbitTemplate)` passa
- [ ] C1a: 404 retornado; zero linhas em `agent_executions` para o executionId
- [ ] C1b: 500 retornado; `agent_executions.status = FAILED` no banco
- [ ] C2 happy path: linha em `tool_calls` com `status = COMPLETED` e `duration_ms = 250`
- [ ] C2a: zero linhas em `tool_calls`; sem exceção não-tratada
- [ ] 6 cenários restantes reportados como `PENDING` (não `FAILED`)
- [ ] `./gradlew test` continua verde (regressão zero nos unit tests)
- [ ] CI job `java-integration` passa sem `services:` adicionais no YAML

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-19 | Versão inicial gerada por `/reversa-plan` | reversa |
