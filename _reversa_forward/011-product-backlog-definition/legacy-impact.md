# Legacy Impact: Definição e Priorização do Product Backlog

> Identificador: `011-product-backlog-definition`
> Data: `2026-06-15`

Este relatório descreve o impacto das alterações da feature sobre os artefatos legados mapeados na extração reversa.

## 1. Arquivos Afetados e Impacto

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `_reversa_forward/011-product-backlog-definition/roadmap.md` | `governança-de-backlog` | regra-nova | LOW | Inclusão de decisões de sequenciamento e paralelismo controlado para o backlog 012–016. |
| `_reversa_forward/011-product-backlog-definition/requirements.md` | `governança-de-backlog` | regra-alterada | LOW | Documentação reforçada das quick wins e da priorização MoSCoW, tornando explícito o alinhamento entre roadmap e backlog. |
| `_reversa_forward/011-product-backlog-definition/investigation.md` | `governança-de-backlog` | regra-nova | LOW | Adição de justificativas do fluxo `/reversa-forward` iterativo e mitigations dos riscos técnicos. |
| `_reversa_forward/011-product-backlog-definition/onboarding.md` | `governança-de-backlog` | regra-nova | LOW | Inclusão de orientação operacional para iniciar 012 e 013, e o fluxo de continuidade do pipeline. |

## 2. Diff Conceitual por Componente

### `governança-de-backlog`
- **Antes:** A feature 011 tinha um backlog conceitual documentado, mas ainda não tinha artefatos de execução codificados ou trilhas de auditoria.
- **Depois:** O processo de governança passou a incluir artefatos operacionais claros (`actions.md`, `progress.jsonl`, `legacy-impact.md`, `regression-watch.md`), criando uma trilha de execução rastreável e transformando a feature de planejamento em uma base concreta para execução futura.

## 3. Preservadas

As seguintes regras 🟢 extraídas de `_reversa_sdd/domain.md` foram preservadas:

* **Manter a extração reversa como âncora do backlog** — a feature 011 continua totalmente ancorada em `_reversa_sdd/`, sem desvios.
* **Rastreabilidade e auditoria de decisões** — o backlog segue o padrão de histórico de alterações e documentação estruturada já adotado pelo Reversa.

## 4. Modificadas

| Regra | Descrição | Justificativa |
|-------|-----------|---------------|
| `governança-de-backlog` | Expansão de documentação de governança e paralelismo no backlog de features 012–016. | A feature 011 agora formaliza explicitamente quais features podem rodar em paralelo e quais dependem de 012. |

## 5. Conclusão

A feature 011 mantém a integridade do legado extraído e entrega valor adicional por meio de artefatos de gestão e execução. Não há impactos críticos sobre as regras de domínio existentes, apenas extensão da governança documentada.
