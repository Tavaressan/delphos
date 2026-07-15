# Regression Watch: CrewAI Parametrizado por Agent ID

> Identificador: `017-crewai-parametrizado-agent-id`
> Gerado por: `/reversa-coding` em `2026-06-24`
> Origem: `legacy-impact.md` seção "Regras Modificadas"

---

## Watch Items

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|----------------------------|---------------------|-------------------|
| W001 | `_reversa_sdd/code-analysis.md#2.4` — instanciação do `Agent()` | `crewai_adapter.py` não deve conter strings literais `"Elevator Specialist"` nem os texts hardcoded de `goal`/`backstory` | `ausência` | Re-extração detectar constante de string hardcoded com valor "Elevator Specialist" no corpo do adaptador |
| W002 | `_reversa_sdd/code-analysis.md#2.4` — `_search_db` | A query de busca vetorial deve conter `JOIN documents` e a cláusula `agent_id IS NULL` | `presença` | Re-extração detectar query com filtro simples `WHERE tenant_id = %s` sem JOIN nem IS NULL |
| W003 | `_reversa_sdd/code-analysis.md#2.4` — `main.py` payload | `main.py` deve extrair `agent_id` do payload e repassar ao adaptador | `presença` | Re-extração não mencionar `agent_id` no fluxo de `process_job` |
| W004 | `_reversa_sdd/domain.md#4.Agent` — fallback de execução | Job sem `agent_id` (campo ausente no payload) não deve publicar `AgentExecutionFailed` | `ausência` | Re-extração indicar que `AgentExecutionFailed` é publicado quando `agent_id` é None |

---

## Observações (sem peso de regressão)

> Os itens abaixo derivam de regras originalmente 🟡 ou 🔴 — monitorados mas não bloqueantes:

- O fallback de `tenantId` com UUID zero em `AgentService.java` permanece como dívida conhecida (`domain.md#4.Agent`) — fora do escopo desta feature.
- A concatenação de múltiplos `.md` raiz do ZIP em `system_instructions` é lacuna identificada em `requirements.md#10` — candidata a feature futura.

---

## Histórico de re-extrações

### Re-extração 2026-07-15 18:19

| ID | Veredito | Observação |
|----|----------|------------|
| W001 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W002 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W003 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W004 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W001 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W002 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W003 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W004 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| Data | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 


### Re-extração 2026-06-24 (mesma sessão de codificação)

| ID | Veredito | Observação |
|----|----------|------------|
| W001 | 🟡 amarelo | `_reversa_sdd/code-analysis.md#2.4` ainda menciona "Elevator Specialist" — SDD gerado em 2026-06-19, antes da feature. Código atual já remove o hardcode. Re-extração confirmará ausência. |
| W002 | 🟡 amarelo | `_reversa_sdd/code-analysis.md#2.4` não menciona `JOIN documents` no `_search_db` do crew-worker — SDD pré-feature. Código atual já contém o JOIN e `IS NULL`. Re-extração confirmará presença. |
| W003 | 🟡 amarelo | `_reversa_sdd/code-analysis.md#2.4` não descreve extração de `agent_id` em `main.py` — SDD pré-feature. Código atual já extrai o campo. Re-extração confirmará presença. |
| W004 | 🟡 amarelo | SDD não descreve comportamento de fallback quando `agent_id=None` — SDD pré-feature. Lógica correta já implementada (fallback sem NACK). Re-extração confirmará ausência do evento de erro. |

<!-- Próxima entrada vai aqui, acima desta, em ordem decrescente -->

| Data | Versão Reversa | W001 | W002 | W003 | W004 | Observações |
|------|----------------|------|------|------|------|-------------|

---

## Arquivadas

<!-- Watch items encerrados (feature removida, regra substituída, ou não aplicável). -->
