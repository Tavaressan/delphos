# Actions: Validação e Testes E2E do RAG Worker Rust

> Identificador: `010-rag-worker-validation`
> Data: `2026-06-12`
> Roadmap: `_reversa_forward/010-rag-worker-validation/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 4 |
| Paralelizáveis (`[//]`) | 2 |
| Maior cadeia de dependência | 3 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Subir o ambiente Docker localmente com `docker compose up -d` e verificar o status de saúde dos serviços. | - | `[//]` | `docker-compose.yml` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T002 | Executar a suite de testes E2E do repositório (`npm run test:e2e`) para validar o fluxo do chat de RAG. | T001 | - | `tests/e2e/runner.test.js` | 🟢 | `[ ]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Realizar uma consulta via curl/REST diretamente no endpoint `/api/executions` para validar a resposta do RAG integrado com pgvector/Gemini. | T002 | - | `java-core/src/main/java/com/company/core/` | 🟢 | `[ ]` |

## Fase 4, Integração

n/a

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Analisar e capturar os logs dos containers `rag-worker` e `core` confirmando o encerramento com sucesso do fluxo RAG. | T003 | `[//]` | `_reversa_forward/010-rag-worker-validation/onboarding.md` | 🟢 | `[ ]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-12 | Versão inicial gerada por `/reversa-to-do` | reversa |
