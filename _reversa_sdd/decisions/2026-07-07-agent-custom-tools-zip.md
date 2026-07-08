# Decisão — Tools Python Customizadas via Pasta `tools/` no ZIP do Agente (issue #129)

## Contexto

O sandbox de execução de scripts introduzido pela #111/#114
(`python-services/crew-worker/src/tools/sandboxed_script_tool.py`) expõe uma tool
genérica, `execute_sandboxed_script`, onde o **próprio LLM escreve o script em
runtime**. Não havia mecanismo para o usuário empacotar um script Python fixo, de sua
autoria, dentro do ZIP do agente e tê-lo registrado como uma tool nomeada e dedicada.

Esta decisão cobre o desenho end-to-end: extração no `java-core` (upload do ZIP) e
registro/execução no `crew-worker`.

## Contrato de `tools/`

- Pasta `tools/` na **raiz** do ZIP do agente (mesmo nível de `instructions.md` e
  `manifest.yaml`). Arquivos em subpastas de `tools/` são ignorados (evita ambiguidade
  de nomes/pacotes Python).
- Cada arquivo `tools/<nome>.py` vira **uma tool nomeada**, com nome derivado do
  basename do arquivo sem a extensão (`tools/sum_values.py` -> tool `sum_values`).
- Convenção de nome: `^[A-Za-z_][A-Za-z0-9_-]*$` (letras, dígitos, `_` e `-`,
  começando por letra ou `_`) — rejeitado no upload (`IllegalArgumentException`) se o
  nome derivado não bater com esse padrão.
- **Uma função pública por arquivo não é imposta estruturalmente** nesta primeira
  versão: o conteúdo do arquivo é tratado como um script Python completo, executado
  como corpo de programa (mesmo modelo de execução da `SandboxedScriptTool`: `python3
  -I -c <script>`), não como um módulo importado com uma função chamada por nome. Ou
  seja, o script deve produzir sua saída via `stdout` (ex.: `print(...)`), assim como
  os scripts ad hoc da tool genérica de #111. Extrair um contrato de
  "uma função pública explícita, com assinatura tipada, invocada com os argumentos da
  tool" é left como trabalho futuro (ver Limitações).
- ZIP sem pasta `tools/` continua funcionando exatamente como hoje — nenhuma tool
  customizada é registrada, retrocompatibilidade total.

## Desenho

### `java-core` (extração e persistência)

`AgentService.parseZip` (upload/atualização de pacote de agente) passa a também
capturar entradas `tools/<nome>.py` (arquivo direto dentro de `tools/`, não em
subpastas), validando o nome derivado do arquivo e lendo o conteúdo bruto do script.

Persistência: nova tabela `agent_custom_tools` (migration `V17__agent_custom_tools.sql`)
— `agent_id` (FK para `agents`, `ON DELETE CASCADE`), `tool_name`, `script_content`
(texto bruto do `.py`, sem qualquer parsing/validação Python do lado Java — ver
"Por que a validação não ocorre no Java" abaixo). Em atualização de pacote
(`updateAgentPackage`), o conjunto anterior é **substituído integralmente** pelo novo
(mesma semântica de replace já usada para `system_instructions`/`manifest_config`).

O ZIP continua sendo enviado integralmente ao MinIO (`uploadZipAndProcessDocuments`),
então os scripts também ficam disponíveis no `agent.zip` bruto — a tabela
`agent_custom_tools` é a fonte de verdade estruturada consultada pelo crew-worker.

### `crew-worker` (registro e execução)

`tools/custom_agent_tools.py`:

1. `_load_custom_tool_rows(agent_id)` — consulta `agent_custom_tools` via
   `psycopg2`/`DATABASE_URL`, seguindo o mesmo padrão de acesso a dados de
   `CrewAiRuntimeAdapter._load_agent_config` (conexão + cursor com `try/finally`,
   fechados sempre, mesma classe de correção da issue #124).
2. `load_custom_tools(agent_id, ...)` — para cada `(tool_name, script_content)`,
   valida estaticamente com `tools.sandboxed_script_tool.validate_script` (alias
   público de `_validate_script`, **mesma allowlist de imports/builtins/atributos
   dunder da #111, sem duplicação de lógica**). Se a validação falhar, levanta
   `ScriptValidationError` imediatamente — a tool correspondente **nunca é
   registrada**, e nenhuma das demais tools do agente é sequer construída (falha
   rápida no registro, não apenas na execução).
3. Scripts válidos viram `CustomScriptTool` (subclasse de `BaseTool` do CrewAI), uma
   por arquivo, com `name` = nome derivado do arquivo. A execução (`_run`) delega
   integralmente para uma instância de `SandboxedScriptTool` (mesmo subprocesso
   isolado, timeout, limites de CPU/memória e truncamento de output da #111) — **zero
   duplicação do sandbox de execução**.

`CrewAiRuntimeAdapter.execute()` (em `runtime/crewai_adapter.py`) chama
`_load_custom_tools()` quando `self.agent_id is not None`, estendendo a lista `tools`
antes de instanciar o `Agent`. Uma `ScriptValidationError` propagada publica
`AgentExecutionFailed` (mesmo padrão de `_load_agent_config`) e aborta a execução —
um agente com uma tool customizada inválida não roda parcialmente.

### Por que a validação não ocorre no `java-core`

A allowlist AST (`ALLOWED_IMPORTS`, `FORBIDDEN_CALLS`, `FORBIDDEN_ATTRS`,
`_validate_script`) é Python e vive em `python-services/crew-worker`. `java-core` e
`crew-worker` são deployáveis independentes sem runtime compartilhado — replicar a
allowlist em Java violaria a exigência explícita da issue de **não duplicar a lógica
de validação**. Por isso, o `java-core` persiste o script bruto sem validação
semântica (mesma postura que já tem para `manifest.yaml`, cujo schema também não é
validado no upload), e a validação acontece uma única vez, no `crew-worker`, no
momento em que as tools do agente são carregadas/registradas para uma execução — antes
de qualquer subprocesso ser criado, portanto antes de qualquer execução real do script
rejeitado.

## Testes

- `java-core/src/test/java/com/company/core/application/AgentServiceTest.java`:
  `createAgent_WithToolsFolder_PersistsCustomToolsPerScript`,
  `createAgent_WithoutToolsFolder_PersistsNoCustomTools`,
  `createAgent_WithInvalidToolFileName_ThrowsIllegalArgumentException`.
- `python-services/crew-worker/tests/test_custom_agent_tools.py`: tool válida
  registrada e executável, script fora da allowlist rejeitado no registro (não na
  execução), agente sem tools customizadas retorna lista vazia, múltiplas tools
  registradas com nomes distintos.
- `python-services/crew-worker/tests/test_route_to_agent.py` ajustado para mockar
  `tools.custom_agent_tools.psycopg2` — `execute()` com `agent_id` definido agora
  também consulta `agent_custom_tools`.

## Limitações conhecidas / trabalho futuro

- Contrato de execução é "script completo via stdout", não "uma função pública com
  assinatura tipada invocada com argumentos estruturados da tool call do LLM". Se o
  produto precisar que tools customizadas recebam parâmetros dinâmicos do agente (não
  apenas rodem um script fixo), isso exigirá evoluir `CustomScriptTool` para inspecionar
  uma assinatura de função (`ast.parse` + `inspect`-like) e passar argumentos — fora do
  escopo desta issue (YAGNI).
- Mesmas limitações de isolamento descritas em
  `_reversa_sdd/decisions/2026-07-03-script-execution-sandbox.md` (allowlist AST como
  garantia primária, `RLIMIT_AS` best-effort fora de Linux/containers).

## Referências

- Supera/estende: #111, #114 (sandbox de execução).
- Issue: #129.
