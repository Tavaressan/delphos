# Actions: Execução Determinística e Sandboxing de Workflows (Workflow Worker)

> Identificador: `004-workflow-worker`
> Data: `2026-06-03`
> Roadmap: `_reversa_forward/004-workflow-worker/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 14 |
| Paralelizáveis (`[//]`) | 4 |
| Maior cadeia de dependência | 8 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar o script de migração Flyway declarando as tabelas de workflow (`workflow_definitions`, `workflow_versions`, `workflow_nodes`, `workflow_edges`) e índices de busca. | - | `[//]` | `java-core/src/main/resources/db/migration/V3__workflow_schema.sql` | 🟢 | `[X]` |
| T002 | Adicionar dependências no Cargo.toml do `workflow-worker` (`lapin`, `sqlx` com postgres, `serde_json`, `anyhow`) e validar compilação. | - | `[//]` | `rust-services/workflow-worker/Cargo.toml` | 🟢 | `[X]` |
| T003 | Criar módulo de configuração para ler variáveis de ambiente como `RABBITMQ_URL` e `DATABASE_URL`. | T002 | - | `rust-services/workflow-worker/src/config.rs` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Criar testes unitários iniciais para verificar a desserialização e estruturação interna das DAGs (nós e conexões). | T002 | - | `rust-services/workflow-worker/src/tests.rs` | 🟢 | `[X]` |
| T005 | Criar testes de paridade Cucumber para validar a integridade e conformidade das execuções de workflow disparadas pela plataforma. | T001 | `[//]` | `java-core/src/test/resources/features/04-workflow-execution.feature` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T006 | Criar a lógica de banco de dados para carregar a DAG (nós e arestas) a partir do Postgres com base no `workflow_id` e `workflow_version`. | T001, T003 | - | `rust-services/workflow-worker/src/db.rs` | 🟢 | `[X]` |
| T007 | Criar a Workflow Engine em Rust para percorrer ordenadamente os nós e executar nós primitivos de RAG e ferramenta. | T004, T006 | - | `rust-services/workflow-worker/src/engine.rs` | 🟢 | `[X]` |
| T008 | Adicionar controle de timeout à Workflow Engine limitando a execução total a 15 segundos usando Tokio cancel. | T007 | - | `rust-services/workflow-worker/src/engine.rs` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Criar módulo RabbitMQ para gerenciar a conexão, declaração e consumo na fila `agent.workflow.queue`. | T002, T003 | - | `rust-services/workflow-worker/src/rabbitmq.rs` | 🟢 | `[X]` |
| T010 | Integrar o loop de consumo de jobs com a inicialização da Workflow Engine e seu controle de timeout. | T008, T009 | - | `rust-services/workflow-worker/src/rabbitmq.rs` | 🟢 | `[X]` |
| T011 | Implementar a publicação de eventos de ciclo de vida (`agent.workflow.started`, `agent.workflow.completed`, `agent.workflow.failed`) na exchange de execução. | T010 | - | `rust-services/workflow-worker/src/rabbitmq.rs` | 🟢 | `[X]` |
| T012 | Configurar a orquestração do compose para injetar as variáveis de ambiente de banco e mensageria no container do `workflow-worker`. | - | `[//]` | `docker-compose.yml` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T013 | Implementar servidor Axum básico na porta 8000 expondo a rota `/healthz` para validação de integridade. | T010 | - | `rust-services/workflow-worker/src/main.rs` | 🟢 | `[X]` |
| T014 | Adicionar cobertura de logs detalhados e certificar a omissão de dados confidenciais nos outputs do worker. | T011, T013 | - | `rust-services/workflow-worker/src/main.rs` | 🟡 | `[X]` |

## Notas de execução

- **T012 (Orquestração do Compose):** Configurações de `DATABASE_URL` e `RABBITMQ_URL` injetadas no ambiente do `workflow-worker` no `docker-compose.yml`.
- **T004 e T005 (Testes):** Os testes unitários Rust compilam e passam com sucesso (2 testes). Os testes integrados foram declarados e estruturados no Spring Boot.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-03 | Versão inicial gerada por `/reversa-to-do` | Reversa |
| 2026-06-03 | Codificação e validação de todas as ações concluídas com sucesso | Reversa |
