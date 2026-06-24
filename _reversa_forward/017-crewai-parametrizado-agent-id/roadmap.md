# Roadmap: CrewAI Parametrizado por Agent ID

> Identificador: `017-crewai-parametrizado-agent-id`
> Data: `2026-06-19`
> Requirements: `_reversa_forward/017-crewai-parametrizado-agent-id/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Delta puramente Python, sem migrations de banco e sem alteração de contratos externos. O `ExecutionController.java` já publica `agent_id` no payload RabbitMQ desde a implementação original (`_reversa_sdd/code-analysis.md#2.2`); o crew-worker simplesmente ignorava o campo.

A mudança distribui-se em três pontos:

1. **`main.py`**: extrai `agent_id` do payload e o repassa ao `CrewAiRuntimeAdapter`.
2. **`crewai_adapter.py`**: recebe `agent_id`, faz SELECT em `agents`, delega o parsing para o novo módulo e aplica os campos dinâmicos ao `Agent` CrewAI. Também corrige o filtro de `_search_db` para incluir isolamento por `agent_id`.
3. **`instruction_parser.py`** (novo): módulo isolado que extrai `role`, `goal` e `backstory` do bloco YAML frontmatter do `system_instructions`. Sem dependências de infra — testável unitariamente com `PyYAML`, que já está no `requirements.txt` do crew-worker (`_reversa_sdd/dependencies.md#4`).

Não há alteração de schema, não há migração Flyway, não há mudança de frontend. A feature é totalmente backward-compatible: jobs sem `agent_id` continuam funcionando via fallback.

## 2. Princípios aplicados

`principles.md` não existe no projeto — seção não aplicável.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|---------------|--------------------------|-------------|
| D-01 | Parser YAML frontmatter como único nível de extração (sem regex de seções Markdown) | Usuário confirmou que o framework de governança usa frontmatter YAML estruturado | Parsing por seções H2; inferência heurística do primeiro parágrafo | 🟢 |
| D-02 | `PyYAML.safe_load()` para parsing do frontmatter | Já listado em `requirements.txt` como `PyYAML 6.0.1` — zero dependência nova | `python-frontmatter` (lib extra); regex manual | 🟢 |
| D-03 | Lookup do agente via `psycopg2` direto (mesmo padrão de `_search_db`) | Consistência com o código existente; sem necessidade de ORM no worker | SQLAlchemy (presente mas usado só no `seed_rag.py`); chamada HTTP à API Java | 🟢 |
| D-04 | `agent_id=None` → fallback silencioso; `agent_id` presente e não encontrado → `AgentExecutionFailed` + NACK | Jobs de teste chegam sem `agent_id` (confirmado na sessão de clarify); erro explícito apenas quando a intenção era usar um agente específico | Sempre falhar se ausente | 🟢 |
| D-05 | `_search_db` filtrado por `JOIN documents d ON dc.document_id = d.id WHERE dc.tenant_id = %s AND (d.agent_id = %s OR d.agent_id IS NULL)` | Alinha com `DocumentChunkRepository.java` que usa `OR d.agent_id IS NULL` para incluir documentos RAG genéricos | Filtro estrito sem IS NULL; coluna `agent_id` direta em `document_chunks` (não existe) | 🟢 |
| D-06 | `instruction_parser.py` como módulo isolado em `runtime/` | Facilita teste unitário sem DB ou RabbitMQ; permite evolução do formato de governança sem tocar no adaptador | Inline no `__init__` do adaptador | 🟢 |

## 4. Premissas

Nenhum marcador `[DÚVIDA]` pendente no `requirements.md`. Sem premissas de risco.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|-----------------------------|-----------------|--------|
| `crew-worker / main.py` | `_reversa_sdd/code-analysis.md#2.4` | regra-alterada | Extrai `agent_id` do payload e passa ao adaptador |
| `crew-worker / crewai_adapter.py` | `_reversa_sdd/code-analysis.md#2.4` | regra-alterada | Lookup no banco + campos dinâmicos no `Agent` CrewAI + filtro corrigido em `_search_db` |
| `crew-worker / instruction_parser.py` | — | componente-novo | Parser YAML frontmatter isolado, sem infra |

## 6. Delta no modelo de dados

Nenhuma alteração de schema. Os campos `agents.name` e `agents.system_instructions` já existem. O JOIN `document_chunks → documents.agent_id` já é possível pela FK existente.

Detalhe completo em: `_reversa_forward/017-crewai-parametrizado-agent-id/data-delta.md`

## 7. Delta de contratos externos

Nenhum contrato externo alterado. O payload RabbitMQ já contém `agent_id` (publicado pelo `ExecutionController.java`); o crew-worker passa a consumir o campo, sem alterar o schema da mensagem.

## 8. Plano de migração

n/a — mudança puramente aditiva em código Python, sem alteração de banco ou de contratos.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| `system_instructions` com BOM ou encoding não-UTF-8 quebra o parser YAML | médio | baixo | `text.strip().lstrip('﻿')` antes de `yaml.safe_load()` no `instruction_parser.py` |
| JOIN `document_chunks → documents` falha se FK não existir (schema divergiu do legado) | alto | baixo | Verificar constraint no banco antes do deploy; fallback: remover filtro agent_id da query |
| Conexão DB no `__init__` para lookup do agente adiciona latência | baixo | médio | Conexão reutiliza o `DATABASE_URL` já usado por `_search_db`; latência esperada < 50 ms em rede Docker local |
| `agent_id` presente no payload mas agente removido do banco entre o publish e o consume | médio | baixo | RF-05: publica `AgentExecutionFailed` + NACK — comportamento já especificado |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Job com agente YAML frontmatter correto → log mostra role do agente, não "Elevator Specialist"
- [ ] Job sem `agent_id` → executa com fallback, sem erro publicado
- [ ] Job com `agent_id` inválido → `AgentExecutionFailed` publicado, mensagem NACK
- [ ] `_search_db` com dois agentes no mesmo tenant → retorna apenas chunks do agente solicitado + chunks sem agente
- [ ] `regression-watch.md` gerado

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-19 | Versão inicial gerada por `reversa-plan` | reversa |