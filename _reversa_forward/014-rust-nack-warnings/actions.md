# Actions: Solução de Warnings Rust (nack options)

> Identificador: `014-rust-nack-warnings`
> Data: `2026-06-17`
> Roadmap: `_reversa_forward/014-rust-nack-warnings/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 8 |
| Paralelizáveis (`[//]`) | 6 |
| Maior cadeia de dependência | 5 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Verificar o estado de compilação inicial e os arquivos com warnings de `BasicNackOptions` | - | `[//]` | `rust-services/Cargo.toml` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T002 | Preparar a suite de testes locais executando checagem nos workers afetados para certificar a presença e local dos warnings de compilação | T001 | - | `rust-services/Cargo.toml` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Alterar a instanciação de `BasicNackOptions` no `rag-worker` para declarar explicitamente os campos `multiple: false` e `requeue: false`, eliminando a sintaxe de update structural `..Default::default()` | T002 | `[//]` | `rust-services/rag-worker/src/rabbitmq.rs` | 🟢 | `[X]` |
| T004 | Alterar a instanciação de `BasicNackOptions` no `workflow-worker` para declarar explicitamente os campos `multiple: false` e `requeue: false`, eliminando a sintaxe de update structural `..Default::default()` | T002 | `[//]` | `rust-services/workflow-worker/src/rabbitmq.rs` | 🟢 | `[X]` |
| T005 | Alterar a instanciação de `BasicNackOptions` no `ingestion-worker` para declarar explicitamente os campos `multiple: false` e `requeue: false`, eliminando a sintaxe de update structural `..Default::default()` | T002 | `[//]` | `rust-services/ingestion-worker/src/main.rs` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T006 | Compilar o workspace `rust-services` e validar que as modificações foram aplicadas e que a compilação ocorre sem nenhum warning relacionado a `BasicNackOptions` | T003, T004, T005 | - | `rust-services/Cargo.toml` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T007 | Executar os testes unitários do workspace Rust (`cargo test`) para confirmar a ausência de regressões operacionais | T006 | `[//]` | `rust-services/Cargo.toml` | 🟢 | `[X]` |
| T008 | Gerar o arquivo de `regression-watch.md` na pasta da feature indicando as regras de integridade do processamento RabbitMQ e tratamento de erros do `nack` | T006 | `[//]` | `_reversa_forward/014-rust-nack-warnings/regression-watch.md` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-17 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-06-17 | Todas as ações marcadas como concluídas no ciclo de coding | reversa |
