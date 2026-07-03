# Decisão — Execução Sandboxed de Scripts pelos Agentes CrewAI (issue #111)

> **Supera** a conclusão registrada em `_reversa_sdd/migration/discard_log.md` e nos
> testes de `python-services/crew-worker/tests/test_script_execution_capability.py`
> introduzidos pelo PR #107, que documentaram — corretamente, à época — que execução
> de scripts **não era** um requisito do produto (issue #101). Este documento **não
> apaga nem invalida** aquele registro histórico; apenas registra a mudança de
> requisito e o desenho adotado para atendê-la com segurança.

## Contexto

Novo requisito de produto: agentes CrewAI precisam executar scripts Python curtos para
automação e transformação de dados (cálculos, parsing, reformatação de conteúdo
recuperado via RAG) como parte de uma tarefa delegada. Os agentes já têm acesso a
documentos privados via RAG, então qualquer execução de código é uma superfície de
risco relevante (RCE, exfiltração de dados, escalonamento) — mitigada pelas camadas de
contenção descritas abaixo.

## Opções consideradas

| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| **A. `subprocess` com timeout + `resource` limits + allowlist AST** | Sem dependência de infra nova; simples de testar unitariamente; portátil (roda no mesmo processo/host do crew-worker); atende ao escopo real (automação/transformação, não execução arbitrária). | Isolamento de SO é best-effort (sem namespaces/cgroups reais fora de um container); `RLIMIT_AS` não é garantido em todo SO (ex.: macOS de dev). | **Escolhida** |
| **B. Container efêmero (Docker-in-Docker ou sidecar) por execução de script** | Isolamento de kernel mais forte (namespaces, cgroups, filesystem overlay descartável). | Latência de cold-start por chamada de tool; nova dependência de infra (acesso ao socket Docker do host, ou um serviço orquestrador de containers); superdimensionado para o escopo declarado (scripts curtos de transformação de dados, não workloads arbitrários). | Descartada nesta fase (YAGNI) — reavaliar se o escopo crescer para execução de código de terceiros não confiável ou workloads longos. |
| **C. gVisor / Firecautor microVM** | Isolamento próximo de VM real, mitiga a maioria das classes de escape de sandbox de processo. | Exige runtime de container compatível (`runsc`) e infra dedicada; complexidade operacional alta para o requisito atual. | Descartada nesta fase — mesma razão de (B), ainda mais desproporcional. |
| **D. Allowlist de comandos/interpretadores sem AST (apenas nome de binário)** | Mais simples que (A). | Não impede um script Python "permitido" de importar `os`/`subprocess` internamente — não atende ao requisito de bloquear acesso a rede/filesystem fora do escopo da tarefa. | Descartada — insuficiente isoladamente. |

## Decisão

Adotada a **Opção A**: `SandboxedScriptTool`
(`python-services/crew-worker/src/tools/sandboxed_script_tool.py`), com as seguintes
camadas de contenção, da mais forte/portátil para a mais fraca/best-effort:

1. **Allowlist estática via AST** (`_validate_script`): o script é parseado com
   `ast.parse` antes de qualquer processo ser criado. Rejeita:
   - `import`/`from ... import` fora de `ALLOWED_IMPORTS` (módulos puramente
     computacionais: `math`, `json`, `re`, `statistics`, `itertools`, `collections`,
     `datetime`, `decimal`, `string`, `textwrap`, `random`, `functools`) — ou seja,
     `os`, `sys`, `subprocess`, `socket`, `shutil`, `ctypes`, `importlib`, `requests`,
     `urllib` etc. são bloqueados.
   - Builtins perigosas: `eval`, `exec`, `compile`, `__import__`, `open`, `input`,
     `getattr`, `vars`, `globals`, `locals`.
   - Atributos dunder usados classicamente para escape de sandbox Python
     (`__class__`, `__subclasses__`, `__globals__`, `__bases__`, `__mro__`,
     `__builtins__`).
2. **Processo filho isolado**: `python3 -I` (modo isolado, ignora `PYTHONPATH`/
   site-packages do usuário do host), `cwd` em diretório temporário efêmero
   (criado e destruído por chamada), `env` mínimo (`PATH` apenas — sem herdar
   variáveis de ambiente/credenciais do processo pai).
3. **Timeout obrigatório**: `subprocess.run(..., timeout=N)`, `N` limitado a no
   máximo 30s (default 5s). Script que trava/loop infinito é morto e retorna
   `status: TIMEOUT`.
4. **Limites de recurso POSIX (best-effort)**: `RLIMIT_CPU` (5s) e `RLIMIT_AS`
   (128MB) via `preexec_fn`. Reforçado pelo kernel em produção (Linux/containers);
   em macOS de desenvolvimento, `RLIMIT_AS` pode não ser totalmente aplicado — por
   isso não é a única garantia (a allowlist de AST e o timeout são as garantias
   primárias e portáveis).
5. **Limite de output**: stdout/stderr truncados a 4096 caracteres.

A tool é **opt-in por manifest** (`agent_settings.allow_script_execution: true`, ver
`src/runtime/crewai_adapter.py`), desligada por padrão — least privilege: agentes
existentes continuam sem a capacidade a menos que explicitamente habilitados.

## Sem acesso à rede

Nenhum módulo de rede (`socket`, `urllib`, `requests`, `http`, `ftplib`, `smtplib`
etc.) está na allowlist de imports, então scripts não conseguem abrir conexões de
rede pela biblioteca padrão. Isso é reforçado pela allowlist de AST (camada 1), não
por isolamento de rede em nível de SO/kernel — limitação conhecida e aceitável dado
o escopo (scripts de transformação de dados, não acesso a serviços externos).

## Limitações conhecidas / trabalho futuro

- O isolamento de filesystem/rede é reforçado por **análise estática (AST)**, não por
  namespaces de kernel ou containers — um bypass da allowlist de AST (bug no
  validador) teria impacto maior do que teria em um sandbox com isolamento de kernel
  real. Mitigação: allowlist restritiva (poucos módulos permitidos) + revisão de
  segurança obrigatória para qualquer mudança em `ALLOWED_IMPORTS`/
  `FORBIDDEN_CALLS`/`FORBIDDEN_ATTRS`.
- Se o requisito de produto evoluir para execução de scripts de terceiros não
  confiáveis, workloads longos, ou linguagens além de Python, reavaliar as Opções B/C
  (container efêmero / gVisor).

## Testes

- `python-services/crew-worker/tests/test_sandboxed_script_tool.py` — execução
  bem-sucedida, timeout, rejeição de import fora da allowlist (`os`, `subprocess`,
  `socket`), rejeição de `open`/`eval`/`exec`, rejeição de escape via dunder,
  truncamento de output.
- `python-services/crew-worker/tests/test_script_execution_capability.py` —
  atualizado para validar que (a) a tool sandboxed está registrada e funcional
  quando habilitada via manifest, (b) desabilitada por padrão, e (c) todas as
  **demais** tools em `src/tools/` continuam livres de padrões de execução de
  código arbitrário (garantia original de #101/#107, agora escopada para excluir
  apenas `sandboxed_script_tool.py`).

## Referências

- Supera: #101, #107 (ver `_reversa_sdd/migration/discard_log.md` e
  `_reversa_sdd/migration/tool_execution_contract.md` para o registro histórico).
- Issue: #111.
