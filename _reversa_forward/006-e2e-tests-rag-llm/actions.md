# Actions: Testes End-to-End e Validação de Scripts

> Identificador: `006-e2e-tests-rag-llm`
> Data: `2026-06-05`
> Roadmap: `_reversa_forward/006-e2e-tests-rag-llm/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 10 |
| Paralelizáveis (`[//]`) | 3 |
| Maior cadeia de dependência | 8 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Adicionar dependência do driver `pg` no `package.json` raiz do monorepo e configurar o script de atalho `"test:e2e"` apontando para o runner. | - | `[//]` | `package.json` | 🟢 | `[X]` |
| T002 | Criar estrutura inicial da pasta de testes E2E e o utilitário `tests/e2e/config.js` para carregamento e validação das variáveis de ambiente. | - | `[//]` | `tests/e2e/config.js` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Criar estrutura básica de testes no arquivo `tests/e2e/runner.test.js` utilizando o runner nativo `node:test`, declarando as suítes e hooks globais. | T002 | - | `tests/e2e/runner.test.js` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Implementar asserção de ciclo de vida do ambiente executando `reset.sh` e `setup.sh` via subprocessos Node e checando integridade dos containers. | T003 | - | `tests/e2e/runner.test.js` | 🟢 | `[X]` |
| T005 | Desenvolver fluxo de upload de documento fictício e polling assíncrono para verificar transição de estado da tabela `documents` para `INDEXED`. | T004 | - | `tests/e2e/runner.test.js` | 🟢 | `[X]` |
| T006 | Codificar consultas no banco de dados via driver `pg` para validar se os chunks foram criados e populados com vetores de 1536 dimensões. | T005 | - | `tests/e2e/runner.test.js` | 🟢 | `[X]` |
| T007 | Adicionar chamada ao endpoint de Chat no backend Spring Boot (`java-core`), validando se a resposta do RAG cita o documento inserido de forma coerente. | T006 | - | `tests/e2e/runner.test.js` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Integrar suporte híbrido de LLM nos testes (comportamento de bypass seguro/erro amigável caso chaves reais da Vertex AI não estejam presentes). | T007 | - | `tests/e2e/runner.test.js` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Implementar no hook `after` (teardown) a exclusão atômica de todos os dados gerados de teste no banco PostgreSQL (documents, chunks, chats). | T008 | - | `tests/e2e/runner.test.js` | 🟢 | `[X]` |
| T010 | Documentar o processo de execução dos testes de integração no onboarding da feature. | - | `[//]` | `_reversa_forward/006-e2e-tests-rag-llm/onboarding.md` | 🟢 | `[X]` |

## Notas de execução

*Bateria completa de testes automatizados E2E implementada com absoluto sucesso utilizando o runner nativo Node.js e driver pg.*

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-06-05 | Status de todas as ações atualizados para concluídos (`[X]`) após a codificação completa da suite de testes. | reversa |
