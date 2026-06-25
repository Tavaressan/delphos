# Actions: Prompt Injection Protection

> Identificador: `018-prompt-injection-protection`
> Data: 2026-06-25
> Roadmap: `_reversa_forward/018-prompt-injection-protection/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 11 |
| Paralelizáveis (`[//]`) | 4 |
| Maior cadeia de dependência | 6 (T001 → T003 → T005 → T007 → T010 → T011) |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar helper de validação e sanitização `prompt_validator.py` no `crew-worker` para limpa de controle Unicode, checagem regex contra injeção, escape de tags XML e limite de 4000 caracteres. | - | `[//]` | `python-services/crew-worker/src/runtime/prompt_validator.py` | 🟢 | `[X]` |
| T002 | Criar helper de validação e sanitização `security.rs` no `rag-worker` para checagem regex, escape de tags XML e limite de 4000 caracteres em Rust. | - | `[//]` | `rust-services/rag-worker/src/security.rs` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. Omitir se a equipe não pratica TDD. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Criar testes unitários em Python `tests/test_prompt_validator.py` cobrindo cenários de jailbreak, estouro de tamanho e escape de XML no helper. | T001 | `[//]` | `python-services/crew-worker/tests/test_prompt_validator.py` | 🟢 | `[X]` |
| T004 | Criar testes unitários em Rust para validar o helper de segurança em Rust com cenários correspondentes. | T002 | `[//]` | `rust-services/rag-worker/src/security_tests.rs` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Integrar a validação de segurança no `crewai_adapter.py` do `crew-worker`. Se a checagem falhar, abortar a execução imediatamente e publicar o evento `AgentExecutionFailed`. | T001, T003 | - | `python-services/crew-worker/src/runtime/crewai_adapter.py` | 🟢 | `[X]` |
| T006 | Integrar a validação no `rabbitmq.rs` do `rag-worker`. Se a checagem falhar, abortar o processamento da mensagem e publicar `AgentExecutionFailedEvent`. | T002, T004 | - | `rust-services/rag-worker/src/rabbitmq.rs` | 🟢 | `[X]` |
| T007 | Estruturar prompt de tarefa no `crewai_adapter.py` com delimitadores XML (`<user_query>` e `<knowledge_base_chunks>`) e instrução clara ao LLM de separação. | T005 | - | `python-services/crew-worker/src/runtime/crewai_adapter.py` | 🟢 | `[X]` |
| T008 | Estruturar prompt do `rag-worker` (`rabbitmq.rs`) com delimitadores XML para query do usuário e chunks de contexto recuperados. | T006 | - | `rust-services/rag-worker/src/rabbitmq.rs` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Declarar o módulo `security.rs` em `main.rs` do `rag-worker` para que compile corretamente na build do Rust. | T002, T006, T008 | - | `rust-services/rag-worker/src/main.rs` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação curta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Adicionar logs nível WARNING específicos nos workers Python e Rust no momento em que um ataque de injeção for bloqueado, sem logar os dados sensíveis na íntegra. | T005, T006 | - | `python-services/crew-worker/src/runtime/crewai_adapter.py` e `rust-services/rag-worker/src/rabbitmq.rs` | 🟢 | `[X]` |
| T011 | Gerar arquivo de documentação de regressão `regression-watch.md` na pasta da feature. | T010 | - | `_reversa_forward/018-prompt-injection-protection/regression-watch.md` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-25 | Versão inicial gerada por `/reversa-to-do` | Reversa |
| 2026-06-25 | Todas as ações concluídas com sucesso | Reversa |
