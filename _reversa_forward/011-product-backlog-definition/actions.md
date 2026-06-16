# Actions: Definição e Priorização do Product Backlog

> Identificador: `011-product-backlog-definition`
> Data: `2026-06-15`
> Roadmap: `_reversa_forward/011-product-backlog-definition/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 8 |
| Paralelizáveis (`[//]`) | 4 |
| Maior cadeia de dependência | 4 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Confirmar a matriz de dependências entre features 012–016 no `roadmap.md` e validar que 012 e 013 são independentes. | - | `[//]` | `_reversa_forward/011-product-backlog-definition/roadmap.md` | 🟢 | `[X]` |
| T002 | Documentar a estratégia de paralelismo controlado em `roadmap.md`, explicitando que 014 e 015 dependem de 012 enquanto 013 pode ser implementada em paralelo. | T001 | `[//]` | `_reversa_forward/011-product-backlog-definition/roadmap.md` | 🟢 | `[X]` |
| T003 | Registrar no `requirements.md` por que as quick wins e a priorização MoSCoW tornam 012 e 013 esforços independentes e alinhados ao backlog. | - | `[//]` | `_reversa_forward/011-product-backlog-definition/requirements.md` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Adicionar no `roadmap.md` a checagem de alinhamento com os artefatos do `_reversa_sdd/` usados para embasar esta meta-feature. | T001 | - | `_reversa_forward/011-product-backlog-definition/roadmap.md` | 🟢 | `[X]` |
| T005 | Verificar que as decisões técnicas listadas em `roadmap.md` removem ambiguidade sobre o próximo passo e suportam a governança do backlog. | T001 | - | `_reversa_forward/011-product-backlog-definition/roadmap.md` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T006 | Atualizar `investigation.md` com a recomendação do fluxo iterativo `/reversa-forward` e as mitigations dos riscos técnicos identificados. | - | `[//]` | `_reversa_forward/011-product-backlog-definition/investigation.md` | 🟢 | `[X]` |
| T007 | Incluir no `onboarding.md` instruções claras para iniciar a próxima feature 012 e 013, citando `/reversa-requirements` como próximo passo imediato. | - | `[//]` | `_reversa_forward/011-product-backlog-definition/onboarding.md` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Registrar no `roadmap.md` o histórico de alterações da versão inicial e confirmar que o documento foi gerado por `/reversa-plan`. | T002,T004 | - | `_reversa_forward/011-product-backlog-definition/roadmap.md` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-15 | Versão inicial gerada por `/reversa-to-do` | reversa |
