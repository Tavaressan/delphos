# Decisão — Isolamento de Kernel para Execução de Scripts via Sidecar (issue #148)

> **Supera** (não apaga) a decisão
> `_reversa_sdd/decisions/2026-07-03-script-execution-sandbox.md` (issue #111), que
> adotou a **Opção A** (execução in-process com allowlist de AST + `subprocess -I` +
> RLIMIT + timeout) e registrou explicitamente que container efêmero (B) e gVisor (C)
> eram YAGNI **naquela fase**. Aquele documento previa o gatilho de reavaliação: "se o
> requisito evoluir para execução de scripts de terceiros não confiáveis... reavaliar as
> Opções B/C". Este documento registra que o gatilho foi atingido e a mudança adotada.
> A decisão de #111 permanece válida como registro histórico e como camada de defesa
> (a allowlist de AST continua sendo a 1ª camada).

## Gatilho atingido

Na #111 os scripts eram executados **in-process, no container do crew-worker** — que
possui credenciais GCP montadas (`/gcloud/adc.json`, `GOOGLE_APPLICATION_CREDENTIALS`)
e egress de rede irrestrito. A contenção dependia inteiramente de análise estática
(allowlist de AST): um único bug no validador significaria RCE com acesso a credenciais
e à rede interna/externa. Como os scripts são **gerados por LLM** (entrada efetivamente
não confiável), essa superfície foi reclassificada como risco que exige isolamento de
kernel real, não apenas análise estática — exatamente o gatilho previsto por #111.

## Opções reconsideradas

| Opção | Avaliação nesta fase | Decisão |
|---|---|---|
| **A. Manter só in-process (status quo #111)** | Contenção depende exclusivamente da allowlist de AST; um bypass alcança credenciais + rede. Insuficiente para código gerado por LLM. | Rejeitada como suficiente isoladamente — rebaixada a 1ª camada (defesa em profundidade). |
| **B. Sidecar dedicado endurecido (HTTP), SEM socket Docker, SEM gVisor obrigatório** | Isolamento de kernel real (namespaces/cgroups do container), sem credenciais, sem egress (rede `internal`), rootfs read-only, tmpfs efêmero. Sem cold-start por chamada (container longevo). Sem nova dependência de runtime. Reusa o motor e a allowlist existentes. | **Escolhida** |
| **B'. Docker-in-Docker / montar `/var/run/docker.sock`** | Criar containers efêmeros por execução daria isolamento, mas expor o socket Docker do host ao crew-worker é uma escalada de privilégio equivalente a root no host — troca um risco de RCE contido por um comprometimento total do host. | **Rejeitada explicitamente** (anti-padrão de segurança). |
| **C. gVisor (`runsc`) / microVM (Firecracker)** | Isolamento próximo de VM. Exige runtime dedicado (`runsc`) em todo ambiente de execução. Desproporcional como default para scripts curtos de transformação. | **Opcional, NÃO default** — documentado abaixo como reforço plugável. |
| **D. SaaS de execução (E2B / Daytona / similares)** | Terceiriza a execução para um provedor externo. Enviaria conteúdo derivado de documentos privados (RAG) para fora do perímetro e adicionaria dependência/custo externos. | **Rejeitada explicitamente** (o dado é corporativo e privado). |

## Decisão (Opção B)

Execução movida para um sidecar dedicado **`script-executor`**:

- **Motor extraído** para `python-services/crew-worker/src/sandbox/executor_core.py`
  (FORA de `src/tools/` — o guard test
  `tests/test_script_execution_capability.py` proíbe termos de execução de processo em
  `src/tools/` exceto `sandboxed_script_tool.py`). O motor reusa `_validate_script`,
  `_set_resource_limits` e as constantes de `tools/sandboxed_script_tool.py` — a
  allowlist de AST **não é duplicada**.
- **Servidor** `src/sandbox/server.py`: HTTP mínimo com `http.server` da **stdlib**
  (zero dependências novas). `POST /run` recebe `{"script", "timeout_seconds"}` e
  devolve o dict de contrato (`status ∈ {OK, REJECTED, TIMEOUT, FAILED}`); `GET /health`
  para o healthcheck.
- **Imagem** `Dockerfile.executor`: `python:3.11-slim`, usuário não-root, copia apenas
  `src/sandbox/` + `src/tools/sandboxed_script_tool.py`. **Não instala crewai/litellm/
  google-cloud** — só stdlib (o import de crewai/pydantic em `sandboxed_script_tool.py`
  degrada para shims quando ausentes).
- **`SandboxedScriptTool._run`** vira cliente: valida por AST (rejeição rápida — 1ª
  camada) e despacha via HTTP (`urllib` stdlib) para `SCRIPT_EXECUTOR_URL`. Falha de
  transporte nunca vaza como `OK` (mapeada para `FAILED`/`TIMEOUT`). **Contrato,
  assinatura, clamp de timeout e eventos permanecem idênticos.** Se `SCRIPT_EXECUTOR_URL`
  não estiver setado (dev/testes unitários), há **fallback in-process** pelo mesmo motor.

### Transporte: HTTP stdlib

`http.server` (servidor) + `urllib.request` (cliente), ambos da biblioteca padrão —
sem novas dependências, sem broker adicional. Suficiente para uma chamada síncrona
request/response de baixo volume dentro da rede docker.

### Sistema de arquivos: tmpfs zerado por execução + rootfs read-only

O container roda com `read_only: true` (rootfs imutável) e um `tmpfs` em `/tmp` como
único ponto gravável. Cada execução usa `tempfile.TemporaryDirectory` sob esse tmpfs,
criado e destruído por chamada — estado zerado por execução **sem recriar o container**
a cada chamada (evita cold-start). Nenhum volume de credenciais é montado.

### gVisor: opcional, não default

`runtime: runsc` **não** é habilitado por padrão (exigiria `runsc` instalado em todos os
ambientes). Fica documentado como reforço plugável: quem operar em ambiente com gVisor
disponível pode adicionar `runtime: runsc` ao serviço `script-executor` para obter
isolamento de sandbox de syscalls além dos namespaces do container, sem outras mudanças.

## Rede sem egress (`internal`)

O `script-executor` participa **apenas** da rede docker `sandbox_net`, declarada
`internal: true` (sem gateway/NAT). Consequências:

- Não há rota nem DNS até os demais serviços (embedding-service, core, postgres...) nem
  à internet — um script hostil não consegue exfiltrar dados nem chamar serviços
  externos, mesmo importando `socket` diretamente (caso a AST fosse burlada).
- Apenas o `crew-worker` participa das duas redes (`default` + `sandbox_net`), sendo o
  único capaz de alcançar `http://script-executor:8000/run`.

## Ausência de credenciais

O serviço `script-executor` **não** monta `adc.json` nem define
`GOOGLE_APPLICATION_CREDENTIALS`. Ainda que um script leia o filesystem, não há segredos
a ler. Endurecimento adicional: `cap_drop: [ALL]`, `security_opt:
["no-new-privileges:true"]`, `pids_limit`, `mem_limit`.

## Camadas resultantes (defesa em profundidade)

1. Allowlist de AST no cliente (`SandboxedScriptTool`) — rejeição rápida antes do
   despacho.
2. Allowlist de AST no sidecar (`executor_core`) — reexecutada (defesa em profundidade).
3. Isolamento de kernel do sidecar — sem credenciais, sem egress (rede `internal`),
   rootfs read-only, tmpfs efêmero, caps dropadas.
4. Processo filho `python3 -I` + `env` mínimo + RLIMIT + timeout + truncamento de output.

## Flag de teste (exclusivo de CI)

Para provar a camada 3 **independentemente** das camadas 1–2, `executor_core` aceita
`ALLOW_UNVALIDATED_SCRIPT=1`, que **pula a validação de AST**. É usado APENAS no job
`e2e-integration` (`tests/e2e/sidecar_isolation_check.py`) para submeter scripts crus e
assertar que `socket.connect(("embedding-service", 8000))` e
`open("/gcloud/adc.json")` **falham**. **Nunca** deve ser habilitado em produção — o
serviço `script-executor` do `docker-compose.yml` não define essa env var.

## Testes

- `tests/test_sandboxed_script_tool.py` — mantém todos os cenários de rejeição por AST
  (#111) e adiciona: roteamento HTTP ao sidecar (transporte mockado, verificando envio
  de `{script, timeout_seconds}` e mapeamento da resposta ao contrato), falha de
  transporte → `FAILED`, timeout de transporte → `TIMEOUT`, e fallback in-process quando
  `SCRIPT_EXECUTOR_URL` não está setado.
- `tests/test_script_execution_capability.py` — guard test continua verde: o novo
  `subprocess` está em `src/sandbox/`, fora de `src/tools/`.
- `e2e-integration` (CI) — sobe `script-executor` na stack e roda a verificação de
  isolamento em runtime (rede/credenciais) + `docker compose exec` confirmando ausência
  de `/gcloud/adc.json` e rootfs read-only.

## Limitação conhecida (validação em runtime)

A verificação de isolamento em runtime depende de `docker compose build/up/exec`, que é
**bloqueado no sandbox de desenvolvimento** — validável apenas no CI. Testes unitários,
lint, formatação e o smoke do servidor stdlib foram executados localmente; a prova de
contenção rede/credenciais roda no job `e2e-integration`.

## Referências

- Supera (evolui): #111 —
  `_reversa_sdd/decisions/2026-07-03-script-execution-sandbox.md`.
- Issue: #148.
