# Legacy Impact: CrewAI Parametrizado por Agent ID

> Identificador: `017-crewai-parametrizado-agent-id`
> Data: `2026-06-24`
> Gerado por: `/reversa-coding`

---

## Arquivos Afetados

| Arquivo afetado | Componente (`_reversa_sdd/architecture.md`) | Tipo | Severidade | Justificativa |
|-----------------|----------------------------------------------|------|------------|---------------|
| `python-services/crew-worker/src/runtime/crewai_adapter.py` | Bounded Context: Conversação CrewAI | `regra-alterada` | MEDIUM | `__init__` agora aceita `agent_id` e faz lookup em `agents`; campo `Agent.role/goal/backstory` passa a ser dinâmico; `_search_db` agora filtra por `agent_id OR IS NULL` via JOIN com `documents` |
| `python-services/crew-worker/src/main.py` | Bounded Context: Conversação CrewAI | `regra-alterada` | LOW | Extrai `agent_id` do payload e o repassa ao adaptador; mudança aditiva, sem quebra de contrato |
| `python-services/crew-worker/src/runtime/instruction_parser.py` | Bounded Context: Conversação CrewAI | `componente-novo` | LOW | Novo módulo isolado de parsing YAML frontmatter sem dependências de infra |

---

## Diff Conceitual por Componente

### `crew-worker / crewai_adapter.py`

**Antes:** `CrewAiRuntimeAdapter.__init__` recebia apenas `channel, execution_id, tenant_id, prompt`. O agente CrewAI era sempre instanciado com `role="Elevator Specialist"`, `goal` e `backstory` hardcoded. A busca vetorial `_search_db` filtrava chunks apenas por `tenant_id`, retornando chunks de todos os agentes do mesmo tenant.

**Depois:** `__init__` recebe adicionalmente `agent_id: str = None`. Quando não-None, executa `SELECT name, system_instructions FROM agents WHERE id = %s`; se o agente não existir, publica `AgentExecutionFailed` e levanta `ValueError`. Os campos `_agent_role`, `_agent_goal`, `_agent_backstory` são populados dinamicamente via `instruction_parser.parse()`. A busca vetorial `_search_db` agora faz `JOIN documents d ON dc.document_id = d.id` e filtra `d.agent_id = %s OR d.agent_id IS NULL`, alinhando com o `DocumentChunkRepository.java` do rag-worker.

### `crew-worker / main.py`

**Antes:** `process_job` não extraía `agent_id` do payload JSON.

**Depois:** `agent_id = job_data.get("agent_id")` é extraído e repassado ao `CrewAiRuntimeAdapter`. Mudança backward-compatible: jobs sem `agent_id` continuam funcionando com `None`.

### `crew-worker / instruction_parser.py` (novo)

Parser YAML frontmatter isolado. Expõe `parse(text: str, name: str) -> dict` com fallback por campo ausente e tratamento de BOM. Zero dependências de infra.

---

## Regras Preservadas

As seguintes regras 🟢 do `_reversa_sdd/domain.md` permanecem intactas após esta feature:

- `AgentExecution`: toda execução persiste `Message` de role `USER` antes de publicar no RabbitMQ — não alterado.
- `AgentExecution`: ao concluir com sucesso, worker publica `AgentExecutionFinished` e Java Core persiste resposta como `Message` role `ASSISTANT` — não alterado.
- `Document`: ciclo `UPLOADING → PROCESSING → INDEXED | FAILED` — não alterado.
- `Tenant`: isolamento por `tenant_id` em todas as entidades — reforçado (não enfraquecido).
- `Agent`: `agents.name` e `agents.system_instructions` usados conforme domínio — agora consumidos pelo crew-worker.

---

## Regras Modificadas

| Regra original (legado) | Estado após feature | Arquivo de origem |
|-------------------------|---------------------|-------------------|
| `Agent()` CrewAI sempre instanciado com `role="Elevator Specialist"` e dados hardcoded | **Alterada** — role/goal/backstory agora provêm de `agents.system_instructions` via parser | `_reversa_sdd/code-analysis.md#2.4` |
| `_search_db` filtra `document_chunks WHERE tenant_id = %s` sem isolamento por agente | **Alterada** — filtro agora inclui `JOIN documents` e `d.agent_id = %s OR d.agent_id IS NULL` | `_reversa_sdd/code-analysis.md#2.4` |
| `main.py` não extrai `agent_id` do payload RabbitMQ | **Alterada** — `agent_id = job_data.get("agent_id")` extraído e repassado | `_reversa_sdd/code-analysis.md#2.4` |
