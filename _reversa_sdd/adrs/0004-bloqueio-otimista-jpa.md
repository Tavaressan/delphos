# ADR 0004 - Estratégia de Concorrência e Bloqueio Otimista nas Entidades JPA (`AgentExecution`)

## Status
🟢 CONFIRMADO (Implementado no `java-core` para a entidade `AgentExecution`)

## Contexto
No módulo `java-core`, eventos de execução de agentes chegam assincronamente através do RabbitMQ (fila `agent.execution.events`). Três microsserviços distintos atuam como produtores de eventos:
- `rag-worker` (Rust) - emite `RetrievalStarted`, `RetrievalCompleted`, `AgentExecutionFailed`
- `crew-worker` (Python) - emite `ToolCallStarted`, `ToolCallFinished`, `AgentExecutionFinished`, `AgentExecutionFailed`
- `workflow-worker` (Rust) - emite `agent.workflow.started`, `agent.workflow.completed`, `agent.workflow.failed`

O ouvinte `@RabbitListener` em `AgentExecutionEventListener` realiza um padrão de processamento `findById` → mutação de estado de `AgentExecution` → `save`. 

Quando múltiplos eventos referentes à mesma execução chegam em rápida sequência ou em paralelo de produtores diferentes, existe o risco de interrupção concorrente (corrida de escrita), levando a sobrescritas silenciosas ("last-write-wins"). Nenhuma das entidades JPA no projeto possuía mecanismo de bloqueio (otimista ou pessimista).

## Decisão
Adotar **Bloqueio Otimista (*Optimistic Locking*)** via anotação `@Version` do Jakarta Persistence (JPA), iniciando pela entidade `AgentExecution`.

### Detalhes da Implementação:
1. **Entidade `AgentExecution`:** Adicionado o campo `version` do tipo `Long`, anotado com `@Version` e `@Column(name = "version")`.
2. **Esquema de Banco de Dados (Flyway):** Criada a migração `V18__agent_executions_version.sql` adicionando a coluna `version BIGINT NOT NULL DEFAULT 0` na tabela `agent_executions`.
3. **Tratamento de Exceções:** Quando um update concorrente desatualizado é tentado no Spring Data JPA, o Hibernate detecta a divergência na cláusula `WHERE id = ? AND version = ?` e o Spring traduz para `OptimisticLockingFailureException` (ou `ObjectOptimisticLockingFailureException`), falhando explicitamente em vez de sobrescrever dados.

## Comparativo: Bloqueio Otimista (`@Version`) vs. Bloqueio Pessimista (`SELECT ... FOR UPDATE`)

| Critério | Bloqueio Otimista (`@Version`) | Bloqueio Pessimista (`FOR UPDATE`) |
|---|---|---|
| **Estratégia** | Assume pouca/média colisão simultânea; valida versão na escrita (`UPDATE ... WHERE version = x`). | Bloqueia a linha no PostgreSQL durante toda a transação (`SELECT ... FOR UPDATE`). |
| **Throughput & Escalabilidade** | **Alto**. Não bloqueia conexões nem leituras; ideal para arquitetura baseada em eventos assíncronos. | **Baixo em alta carga**. Pode causar esgotamento de pool de conexões do PostgreSQL e deadlocks. |
| **Integridade de Dados** | Impede "last-write-wins" lançando `OptimisticLockingFailureException` quando ocorre concorrência real. | Impede "last-write-wins" forçando serialização no banco de dados. |
| **Overhead no Banco** | Mínimo (uma coluna `BIGINT` incrementada no `UPDATE`). | Elevado (gerenciamento de locks de linha pelo engine transacional do Postgres). |
| **Adequação ao Projeto** | **Ideal.** As execuções de agentes progridem em etapas sequenciais com pouca sobreposição temporal exata. | Desnecessário para o perfil de escrita assíncrona via RabbitMQ. |

## Consequências
1. **Proteção contra sobrescrita silenciosa:** Qualquer tentativa de atualizar uma instância com versão desatualizada resultará em `OptimisticLockingFailureException`.
2. **Padrão arquitetural estabelecido:** Entidades JPA com mutações concorrentes em novos fluxos devem seguir a mesma estratégia adicionando `@Version`.
