# Roadmap: Execução Determinística e Sandboxing de Workflows (Workflow Worker)

> Identificador: `004-workflow-worker`
> Data: `2026-06-03`
> Requirements: `_reversa_forward/004-workflow-worker/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O `workflow-worker` será implementado em Rust como um executor de DAGs assíncrono e determinístico consumindo eventos do RabbitMQ. Diferente dos agentes cognitivos, o worker não realiza raciocínio ad-hoc via LLM nem roda scripts Groovy/Rhai dinâmicos em runtime nesta fase. Em vez disso, ele consome tarefas estruturadas a partir da fila `agent.workflow.queue`, recupera a topologia da DAG (nós e conexões) a partir de tabelas Postgres centralizadas e executa sequencialmente os nós de processamento correspondentes (como execução RAG delegada ou acionamento de ferramentas). A extensibilidade via scripts dinâmicos é adiada para o futuro e será provida via WebAssembly (WASM).

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| n/a       | Não há arquivo de princípios ativo no projeto. | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Execução baseada em DAGs declarativas no Postgres | Garante determinismo total e facilita auditoria/replay de workflows sem complexidade de scripting dinâmico. | Scripts Groovy/Rhai | 🟢 |
| D-02 | Isolamento físico futuro com WASM Sandbox | Isolamento seguro de CPU/Memória sem JVM para scripts dinâmicos de terceiros. | Rhai, JVM | 🟢 |
| D-03 | Filas e Contratos RabbitMQ específicos de Workflow | Manter a mesma taxonomia estruturada do RAG e isolamento de tráfego. | Compartilhar fila do RAG ou fila cognitiva | 🟢 |
| D-04 | Persistência central de topologias no Postgres | Permite versionamento, governança de quem alterou e replay determinístico fácil, evitando arquivos locais efêmeros ou payloads de mensagens excessivamente longos. | arquivos locais no pod, payloads JSON gigantes com a DAG completa | 🟢 |

## 4. Premissas

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| Nenhuma premissa pendente | n/a | Todas as dúvidas de requisitos foram sanadas na etapa clarify. |

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `workflow-worker` | `_reversa_sdd/architecture.md#2` | componente-novo | Materialização física do worker Rust fictício mapeado no Compose como executor determinístico de DAGs integrado a RabbitMQ e Postgres. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Adição de novas tabelas relacionais no banco PostgreSQL para definição e controle de versão das DAGs de workflow (`workflow_definitions`, `workflow_versions`, `workflow_nodes`, `workflow_edges`).
- Detalhe completo em: `_reversa_forward/004-workflow-worker/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| `agent.workflow.requested` | fila | `_reversa_forward/004-workflow-worker/interfaces/rabbitmq-workflow.md` |

## 8. Plano de migração

1. Criação do script Flyway migration `V3__workflow_schema.sql` no `java-core` para declarar as tabelas de topologia de DAG.
2. Execução da migration e propagação das alterações para os ambientes locais (via Docker Compose).
3. Cadastro inicial (seed) de DAGs de conformidade padrão no banco de dados para possibilitar testes funcionais integrados.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Lentidão ao executar nós sequenciais de longa duração na DAG | médio | média | Uso do Tokio runtime assíncrono e paralelização interna de nós independentes na DAG. |
| Inconsistência entre a versão da DAG em execução e alterações concorrentes de definições de DAG no PostgreSQL | alto | baixa | Versionamento estrito das definições com chaves compostas (`workflow_id` + `workflow_version`), referenciando a versão imutável do job no payload do RabbitMQ. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado
- [ ] Compilação do `workflow-worker` no Docker Compose executada com sucesso
- [ ] Execução bem-sucedida do cenário Gherkin de workflow determinístico nos testes Cucumber integrados do Spring Boot.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-03 | Versão inicial gerada por `/reversa-plan` | Reversa |
