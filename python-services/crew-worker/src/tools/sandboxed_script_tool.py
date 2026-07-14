"""
Tool sandboxed para execução de scripts Python por agentes CrewAI (issue #111),
agora com isolamento de kernel real via serviço sidecar (issue #148).

## Contexto

Supera a decisão registrada em #101/#107 (`tests/test_script_execution_capability.py`),
que concluiu — corretamente, à época — que execução de scripts não era um requisito do
produto e travou essa ausência com testes. Um novo requisito de automação/transformação
de dados sobre conteúdo recuperado via RAG (cálculos, parsing, reformatação) exige a
capacidade de rodar pequenos scripts Python, sob sandboxing estrito.

## Evolução para isolamento de kernel (issue #148)

O desenho original (#111) executava o script *in-process*, no próprio container do
crew-worker (que possui credenciais GCP e egress de rede), apoiado apenas em allowlist
de AST + `subprocess python3 -I` + RLIMIT + timeout. A #148 eleva a contenção movendo a
execução real para um **sidecar dedicado** (`script-executor`), sem credenciais e sem
egress de rede (rede docker `internal`, rootfs read-only, tmpfs efêmero por execução).
Esta tool passa a ser um *cliente*: valida por AST (rejeição rápida — 1ª camada) e
despacha o script para o sidecar via HTTP (`SCRIPT_EXECUTOR_URL`). O motor de execução
foi extraído para `sandbox/executor_core.py` (fora de `src/tools/`), reusado tanto pelo
sidecar quanto pelo fallback in-process. Ver
`_reversa_sdd/decisions/2026-07-08-script-execution-kernel-isolation.md`.

## Camadas de contenção (resumo)

1. **Allowlist estática via AST** (`_validate_script`): antes de qualquer despacho, o
   script é parseado com `ast.parse` e rejeitado se contiver import fora da allowlist
   (`ALLOWED_IMPORTS`), chamada de builtin perigosa (`eval`, `exec`, `open`,
   `__import__`, ...) ou acesso a atributo dunder classicamente usado para sandbox
   escaping (`__subclasses__`, `__globals__`, ...). Aplicada tanto no cliente (aqui)
   quanto no sidecar (defesa em profundidade — ver `sandbox/executor_core.py`).
2. **Isolamento de kernel (sidecar)**: a execução real roda em um container endurecido,
   sem credenciais, sem egress de rede, rootfs read-only e tmpfs zerado por execução —
   um bypass hipotético da allowlist de AST não alcança rede nem segredos.
3. **Processo filho isolado**: dentro do sidecar, o script validado roda via
   `python3 -I` em diretório temporário efêmero, com `env` mínimo.
4. **Timeout obrigatório**, **limites de recurso POSIX** (RLIMIT_CPU/AS) e **limite de
   output** (`MAX_OUTPUT_CHARS`) permanecem — ver `sandbox/executor_core.py`.

Esta tool NÃO expõe execução de comando arbitrário (sem `command`/`shell` livre) — apenas
scripts Python cujo conteúdo é estaticamente validado antes da execução.
"""

import ast
import json
import os
import resource
import time
import urllib.error
import urllib.request
import uuid

# crewai/pydantic são dependências do crew-worker, mas NÃO do sidecar
# `script-executor` (issue #148), que reusa deste módulo apenas a validação de AST
# e os limites de recurso — puramente stdlib. Importamos crewai/pydantic de forma
# opcional para que `sandbox/executor_core.py` (e o sidecar) possam importar
# `_validate_script`/`_set_resource_limits`/constantes sem arrastar a stack pesada
# do CrewAI. Quando ausentes, a classe `SandboxedScriptTool` continua definida sobre
# shims mínimos (o sidecar nunca a instancia; quem a usa é o crew-worker, onde as
# dependências reais estão presentes).
try:
    from crewai.tools import BaseTool
    from pydantic import Field
except ImportError:  # pragma: no cover - caminho exercido só no sidecar

    class BaseTool:  # type: ignore
        """Shim mínimo de crewai.tools.BaseTool para ambientes sem CrewAI."""

        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

        def run(self, **kwargs):
            return self._run(**kwargs)

    def Field(default=None, **kwargs):  # type: ignore
        return default


# Módulos que os scripts podem importar. Qualquer coisa fora desta lista (os, sys,
# subprocess, socket, shutil, ctypes, importlib, requests, urllib, ...) é rejeitada
# antes da execução.
ALLOWED_IMPORTS = frozenset(
    {
        "math",
        "json",
        "re",
        "statistics",
        "itertools",
        "collections",
        "datetime",
        "decimal",
        "string",
        "textwrap",
        "random",
        "functools",
    }
)

# Builtins perigosas: nunca permitidas dentro do script do agente.
FORBIDDEN_CALLS = frozenset(
    {
        "eval",
        "exec",
        "compile",
        "__import__",
        "open",
        "input",
        "getattr",
        "vars",
        "globals",
        "locals",
    }
)

# Atributos dunder usados classicamente para escapar de sandboxes Python (ex.:
# `().__class__.__bases__[0].__subclasses__()`).
FORBIDDEN_ATTRS = frozenset(
    {
        "__class__",
        "__subclasses__",
        "__globals__",
        "__bases__",
        "__mro__",
        "__builtins__",
        "__import__",
    }
)

MAX_OUTPUT_CHARS = 4096
DEFAULT_TIMEOUT_SECONDS = 5
MAX_TIMEOUT_SECONDS = 30
MAX_MEMORY_BYTES = 128 * 1024 * 1024  # 128MB
MAX_CPU_SECONDS = 5

# Margem (segundos) somada ao timeout do script para o timeout de transporte HTTP
# até o sidecar: o sidecar já mata o script no timeout; a margem cobre apenas o
# overhead de rede/serialização antes que o cliente desista.
SIDECAR_TRANSPORT_MARGIN_SECONDS = 5


class ScriptValidationError(ValueError):
    """Levantada quando um script viola a allowlist de sandbox."""


def validate_script(script: str) -> None:
    """Alias público de `_validate_script`, para reuso fora deste módulo (ex.:
    `tools/custom_agent_tools.py`, issue #129) sem depender de nome "privado"."""
    _validate_script(script)


def _validate_script(script: str) -> None:
    """Valida estaticamente o script via AST antes de qualquer execução.

    Levanta ScriptValidationError se o script contiver import fora da allowlist,
    chamada de builtin perigosa ou acesso a atributo dunder sensível.
    """
    try:
        tree = ast.parse(script, mode="exec")
    except SyntaxError as e:
        raise ScriptValidationError(f"Script com erro de sintaxe: {e}") from e

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_module = alias.name.split(".")[0]
                if root_module not in ALLOWED_IMPORTS:
                    raise ScriptValidationError(
                        f"Import não permitido: '{alias.name}'. Módulos permitidos: "
                        f"{sorted(ALLOWED_IMPORTS)}"
                    )
        elif isinstance(node, ast.ImportFrom):
            root_module = (node.module or "").split(".")[0]
            if root_module not in ALLOWED_IMPORTS:
                raise ScriptValidationError(
                    f"Import não permitido: '{node.module}'. Módulos permitidos: "
                    f"{sorted(ALLOWED_IMPORTS)}"
                )
        elif isinstance(node, ast.Name) and node.id in FORBIDDEN_CALLS:
            raise ScriptValidationError(f"Uso não permitido de '{node.id}'.")
        elif isinstance(node, ast.Attribute) and node.attr in FORBIDDEN_ATTRS:
            raise ScriptValidationError(
                f"Acesso não permitido a atributo '{node.attr}'."
            )


def _set_resource_limits():
    """Aplica limites de CPU e memória ao processo filho (best-effort, POSIX).

    Executado via `preexec_fn` — roda no processo filho logo após o fork, antes do
    exec do interpretador Python isolado. Reusado por `sandbox/executor_core.py`.
    """
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (MAX_CPU_SECONDS, MAX_CPU_SECONDS))
    except (ValueError, OSError):
        pass
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORY_BYTES, MAX_MEMORY_BYTES))
    except (ValueError, OSError):
        pass


class SandboxedScriptTool(BaseTool):
    """Tool CrewAI que executa scripts Python curtos em um sandbox restrito, para
    automação/transformação de dados (issue #111). A execução real é delegada ao
    sidecar `script-executor` (issue #148) quando `SCRIPT_EXECUTOR_URL` está setado,
    com fallback in-process para dev/testes. Ver docstring do módulo para o desenho
    completo das camadas de contenção."""

    name: str = "execute_sandboxed_script"
    description: str = (
        "Executa um script Python curto em um sandbox restrito (allowlist de "
        "imports, timeout obrigatório, limites de CPU/memória, sem acesso à rede "
        "ou ao sistema de arquivos fora de um diretório temporário efêmero) para "
        "automação e transformação de dados (cálculos, parsing, reformatação de "
        "conteúdo). Não executa código arbitrário irrestrito."
    )

    channel: any = Field(None, exclude=True)
    execution_id: str = Field(None)
    tenant_id: str = Field(None)

    def __init__(self, channel=None, execution_id=None, tenant_id=None, **kwargs):
        super().__init__(**kwargs)
        self.channel = channel
        self.execution_id = execution_id
        self.tenant_id = tenant_id

    def _run(self, script: str, timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS) -> str:
        tool_call_id = str(uuid.uuid4())
        self._publish_event(
            "ToolCallStarted",
            {
                "toolCallId": tool_call_id,
                "toolName": self.name,
                "inputPayload": {
                    "script_len": len(script),
                    "timeout_seconds": timeout_seconds,
                },
            },
        )

        timeout_seconds = max(1, min(int(timeout_seconds), MAX_TIMEOUT_SECONDS))

        # 1ª camada: rejeição rápida por AST antes de despachar ao sidecar. Mantém
        # o contrato original (status REJECTED sem custo de execução/rede).
        try:
            _validate_script(script)
        except ScriptValidationError as e:
            result = json.dumps(
                {"status": "REJECTED", "error": str(e)}, ensure_ascii=False
            )
            self._finish(tool_call_id, "FAILED", result, 0, str(e))
            return result

        start = time.time()
        result_dict = self._execute(script, timeout_seconds)
        elapsed_ms = int((time.time() - start) * 1000)

        result = json.dumps(result_dict, ensure_ascii=False)
        status = result_dict.get("status")
        if status == "OK":
            self._finish(tool_call_id, "COMPLETED", result, elapsed_ms, None)
        elif status == "TIMEOUT":
            self._finish(tool_call_id, "FAILED", result, elapsed_ms, "timeout")
        elif status == "REJECTED":
            self._finish(
                tool_call_id, "FAILED", result, elapsed_ms, result_dict.get("error")
            )
        else:  # FAILED
            error_log = result_dict.get("stderr") or result_dict.get("error")
            self._finish(tool_call_id, "FAILED", result, elapsed_ms, error_log)
        return result

    def _execute(self, script: str, timeout_seconds: int) -> dict:
        """Despacha a execução para o sidecar (se `SCRIPT_EXECUTOR_URL` estiver
        setado) ou executa in-process como fallback (dev/testes sem Docker).
        Retorna o dict de contrato ({"status": OK|REJECTED|TIMEOUT|FAILED, ...})."""
        executor_url = os.environ.get("SCRIPT_EXECUTOR_URL")
        if not executor_url:
            # Fallback in-process: reusa o mesmo motor do sidecar. Import tardio
            # para evitar dependência circular no carregamento do módulo.
            from sandbox.executor_core import execute_script

            return execute_script(script, timeout_seconds)
        return self._execute_via_sidecar(executor_url, script, timeout_seconds)

    def _execute_via_sidecar(
        self, executor_url: str, script: str, timeout_seconds: int
    ) -> dict:
        """Chama o sidecar `script-executor` via HTTP (stdlib `urllib`).

        Falha de transporte (conexão recusada, DNS, timeout) NUNCA é reportada como
        `OK`: é mapeada para `TIMEOUT` (timeout de transporte) ou `FAILED` (demais).
        """
        payload = json.dumps(
            {"script": script, "timeout_seconds": timeout_seconds}
        ).encode("utf-8")
        req = urllib.request.Request(
            executor_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        transport_timeout = timeout_seconds + SIDECAR_TRANSPORT_MARGIN_SECONDS
        try:
            with urllib.request.urlopen(req, timeout=transport_timeout) as resp:
                body = resp.read().decode("utf-8")
            return json.loads(body)
        except TimeoutError:
            return {
                "status": "TIMEOUT",
                "error": (
                    f"Executor sidecar excedeu o timeout de transporte "
                    f"({transport_timeout}s)"
                ),
            }
        except (urllib.error.URLError, OSError, ValueError) as e:
            if isinstance(getattr(e, "reason", None), TimeoutError):
                return {
                    "status": "TIMEOUT",
                    "error": (
                        f"Executor sidecar excedeu o timeout de transporte "
                        f"({transport_timeout}s)"
                    ),
                }
            return {
                "status": "FAILED",
                "error": f"Falha ao contatar o executor sidecar: {e}",
                "stdout": "",
                "stderr": str(e),
            }

    def _finish(self, tool_call_id, status, output, elapsed_ms, error_log):
        self._publish_event(
            "ToolCallFinished",
            {
                "toolCallId": tool_call_id,
                "status": status,
                "outputResponse": output,
                "executionTimeMs": elapsed_ms,
                "errorLog": error_log,
            },
        )

    def _publish_event(self, event_type: str, payload: dict):
        if self.channel is None:
            return
        try:
            event_msg = {
                "eventType": event_type,
                "executionId": self.execution_id,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "payload": payload,
            }
            self.channel.basic_publish(
                exchange="agent.execution.exchange",
                routing_key="agent.execution.event",
                body=json.dumps(event_msg),
            )
        except Exception as e:
            print(f"[SandboxedScriptTool] Failed to publish event {event_type}: {e}")
