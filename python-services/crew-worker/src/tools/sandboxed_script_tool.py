"""
Tool sandboxed para execução de scripts Python por agentes CrewAI (issue #111).

## Contexto

Supera a decisão registrada em #101/#107 (`tests/test_script_execution_capability.py`),
que concluiu — corretamente, à época — que execução de scripts não era um requisito do
produto e travou essa ausência com testes. Um novo requisito de automação/transformação
de dados sobre conteúdo recuperado via RAG (cálculos, parsing, reformatação) exige a
capacidade de rodar pequenos scripts Python, sob sandboxing estrito.

Decisão e desenho completos, incluindo alternativas consideradas (container efêmero,
gVisor/Firecracker) e por que foram descartadas nesta fase:
`_reversa_sdd/decisions/2026-07-03-script-execution-sandbox.md`.

## Camadas de contenção (resumo)

1. **Allowlist estática via AST** (`_validate_script`): antes de qualquer processo ser
   criado, o script é parseado com `ast.parse` e rejeitado se contiver import fora da
   allowlist (`ALLOWED_IMPORTS`), chamada de builtin perigosa (`eval`, `exec`, `open`,
   `__import__`, ...) ou acesso a atributo dunder classicamente usado para sandbox
   escaping (`__subclasses__`, `__globals__`, ...).
2. **Processo filho isolado**: o script validado roda via `python3 -I` (modo isolado,
   ignora `PYTHONPATH`/site-packages do usuário) em um diretório temporário efêmero,
   com um `env` mínimo (sem variáveis de ambiente do processo pai, sem credenciais).
3. **Timeout obrigatório**: `subprocess.run(..., timeout=...)`, limitado a no máximo
   `MAX_TIMEOUT_SECONDS`. O processo é morto pelo runtime do subprocess se exceder.
4. **Limites de recurso (POSIX, best-effort)**: `RLIMIT_CPU` e `RLIMIT_AS` aplicados via
   `preexec_fn` no processo filho. Em produção (Linux/containers) isso é reforçado pelo
   kernel; em macOS de desenvolvimento, `RLIMIT_AS` pode não ser totalmente aplicado —
   tratado como camada best-effort, não como única garantia (a allowlist de AST e o
   timeout são as garantias primárias, portáveis entre plataformas).
5. **Limite de output**: stdout/stderr truncados a `MAX_OUTPUT_CHARS`.

Esta tool NÃO expõe execução de comando arbitrário (sem `command`/`shell` livre) — apenas
scripts Python cujo conteúdo é estaticamente validado antes da execução.
"""

import ast
import json
import os
import resource
import subprocess
import sys
import tempfile
import time
import uuid

from crewai.tools import BaseTool
from pydantic import Field

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


class ScriptValidationError(ValueError):
    """Levantada quando um script viola a allowlist de sandbox."""


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
    exec do interpretador Python isolado.
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
    automação/transformação de dados (issue #111). Ver docstring do módulo para o
    desenho completo das camadas de contenção."""

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

        try:
            _validate_script(script)
        except ScriptValidationError as e:
            result = json.dumps(
                {"status": "REJECTED", "error": str(e)}, ensure_ascii=False
            )
            self._finish(tool_call_id, "FAILED", result, 0, str(e))
            return result

        start = time.time()
        with tempfile.TemporaryDirectory(prefix="crew_sandbox_") as tmp_dir:
            env = {"PATH": "/usr/bin:/bin"}
            try:
                proc = subprocess.run(
                    [sys.executable, "-I", "-c", script],
                    cwd=tmp_dir,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    preexec_fn=_set_resource_limits if os.name == "posix" else None,
                )
            except subprocess.TimeoutExpired:
                elapsed_ms = int((time.time() - start) * 1000)
                result = json.dumps(
                    {
                        "status": "TIMEOUT",
                        "error": f"Script excedeu timeout de {timeout_seconds}s",
                    },
                    ensure_ascii=False,
                )
                self._finish(tool_call_id, "FAILED", result, elapsed_ms, "timeout")
                return result

        elapsed_ms = int((time.time() - start) * 1000)
        stdout = proc.stdout[:MAX_OUTPUT_CHARS]
        stderr = proc.stderr[:MAX_OUTPUT_CHARS]

        if proc.returncode != 0:
            result = json.dumps(
                {
                    "status": "FAILED",
                    "returncode": proc.returncode,
                    "stdout": stdout,
                    "stderr": stderr,
                },
                ensure_ascii=False,
            )
            self._finish(tool_call_id, "FAILED", result, elapsed_ms, stderr)
            return result

        result = json.dumps(
            {"status": "OK", "stdout": stdout, "stderr": stderr}, ensure_ascii=False
        )
        self._finish(tool_call_id, "COMPLETED", result, elapsed_ms, None)
        return result

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
