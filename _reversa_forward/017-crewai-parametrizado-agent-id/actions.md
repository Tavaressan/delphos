# Actions: CrewAI Parametrizado por Agent ID

> Identificador: `017-crewai-parametrizado-agent-id`
> Data: `2026-06-24`
> Roadmap: `_reversa_forward/017-crewai-parametrizado-agent-id/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 11 |
| Paralelizáveis (`[//]`) | 5 |
| Maior cadeia de dependência | 5 (T001 → T006 → T007 → T010 → T011) |

## Fase 1, Preparação

<!-- Scaffolding do novo módulo isolado antes de qualquer lógica ou teste. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar `instruction_parser.py` com stub público `parse(text: str, name: str) -> dict` levantando `NotImplementedError` — scaffolding do módulo isolado, sem lógica de infra | - | - | `python-services/crew-worker/src/runtime/instruction_parser.py` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes unitários escritos antes da implementação (TDD). Todos falham até Fase 3. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T002 | Criar `tests/test_instruction_parser.py` cobrindo 5 cenários: (1) frontmatter completo com role/goal/backstory, (2) frontmatter parcial → fallback campo a campo, (3) sem frontmatter → fallback completo, (4) text None/vazio → backstory legado, (5) BOM no início do texto | - | `[//]` | `python-services/crew-worker/tests/test_instruction_parser.py` | 🟢 | `[X]` |
| T003 | Criar `tests/test_crewai_adapter.py` mockando psycopg2 com 4 casos: (1) agent_id=None → fallback sem NACK, (2) agent_id válido → role/goal/backstory dinâmicos, (3) agent_id inválido → AgentExecutionFailed publicado + NACK, (4) falha de conexão DB → AgentExecutionFailed + NACK | - | `[//]` | `python-services/crew-worker/tests/test_crewai_adapter.py` | 🟡 | `[X]` |
| T004 | Criar `tests/test_search_db.py` mockando cursor psycopg2 e verificando que o SQL gerado contém `JOIN documents d ON dc.document_id = d.id` e `(d.agent_id = %s OR d.agent_id IS NULL)` — chunks de outro agente são excluídos | - | `[//]` | `python-services/crew-worker/tests/test_search_db.py` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature: parser YAML e adaptador com lookup dinâmico. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Implementar `instruction_parser.parse()`: strip BOM (`lstrip('﻿')`), detectar bloco `---`, `yaml.safe_load()`, fallback campo a campo (`role` → `name`, `goal` → texto genérico fixo em português, `backstory` → `text` completo); se text None/vazio, retornar backstory padrão legado em inglês | T001, T002 | `[//]` | `python-services/crew-worker/src/runtime/instruction_parser.py` | 🟢 | `[X]` |
| T006 | Modificar `CrewAiRuntimeAdapter.__init__` para receber `agent_id`; se não-None: executar `SELECT name, system_instructions FROM agents WHERE id = %s` via psycopg2, chamar `instruction_parser.parse()`, armazenar `self._agent_role/goal/backstory`; se agent_id não encontrado: publicar `AgentExecutionFailed` + NACK (levantar exceção dedicada para interromper o fluxo); se agent_id=None: usar valores hardcoded legados sem erro | T001, T003 | `[//]` | `python-services/crew-worker/src/runtime/crewai_adapter.py` | 🟡 | `[X]` |
| T007 | Substituir campos hardcoded no bloco de instanciação do `Agent()` CrewAI dentro de `crewai_adapter.py` por `self._agent_role`, `self._agent_goal`, `self._agent_backstory` — remover strings literais "Elevator Specialist" e equivalentes | T006 | - | `python-services/crew-worker/src/runtime/crewai_adapter.py` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Wiring do main.py com o adaptador e correção do filtro de busca vetorial. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Modificar `main.py`: extrair `agent_id = job_data.get("agent_id")` do payload do job e passar como argumento nomeado ao `CrewAiRuntimeAdapter(agent_id=agent_id, ...)` | T006 | `[//]` | `python-services/crew-worker/src/main.py` | 🟢 | `[X]` |
| T009 | Modificar `_search_db` em `crewai_adapter.py`: refatorar SQL para `JOIN documents d ON dc.document_id = d.id WHERE dc.tenant_id = %s AND (d.agent_id = %s OR d.agent_id IS NULL)` com bind params corrigidos — verificar que `agent_id` é passado como parâmetro e não concatenado na string | T006 | `[//]` | `python-services/crew-worker/src/runtime/crewai_adapter.py` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Observabilidade e artefato de regressão para o ciclo reversa. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Adicionar log em `crewai_adapter.py` imediatamente antes do `kickoff()`: nível INFO com `agent_id`, `role` extraído e `backstory[:80]` — permite rastrear qual agente foi executado sem expor o texto completo | T007, T009 | - | `python-services/crew-worker/src/runtime/crewai_adapter.py` | 🟢 | `[X]` |
| T011 | Gerar `regression-watch.md` na pasta da feature documentando os 3 pontos de regressão: (1) `_search_db` deve filtrar por agent_id+IS NULL, (2) `Agent()` não deve conter strings hardcoded de role, (3) job sem agent_id não deve publicar `AgentExecutionFailed` | T010 | - | `_reversa_forward/017-crewai-parametrizado-agent-id/regression-watch.md` | 🟢 | `[X]` |

## Notas de execução

- T001 e T005 executados em sequência imediata na mesma rodada; stub não foi persistido separadamente, implementação final foi gravada diretamente.
- T003 (test_crewai_adapter) mocka também `crewai.LLM` para evitar dependência de chaves de API no ambiente de teste.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-24 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-06-24 | Todas as ações concluídas por `/reversa-coding` | reversa |
