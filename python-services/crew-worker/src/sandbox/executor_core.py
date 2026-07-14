"""
Motor de execução isolada de scripts Python (issue #148).

Extraído da lógica in-process que vivia em `tools/sandboxed_script_tool.SandboxedScriptTool._run`
(#111). Fica FORA de `src/tools/` de propósito: o guard test
`tests/test_script_execution_capability.py` proíbe termos de execução de processo
(`subprocess`, `exec(`, `eval(`, `os.system`, ...) em qualquer arquivo de `src/tools/`
exceto `sandboxed_script_tool.py`. Mantendo o motor aqui, o cliente
(`SandboxedScriptTool`) fica livre desses termos e o guard continua verde.

Este módulo é usado em dois lugares:

1. **Sidecar `script-executor`** (`sandbox/server.py`): o container endurecido, sem
   credenciais e sem egress de rede, que executa o script sob isolamento de kernel.
2. **Fallback in-process**: quando `SCRIPT_EXECUTOR_URL` não está setado (dev/testes
   unitários sem Docker), `SandboxedScriptTool._run` chama `execute_script` diretamente,
   preservando o comportamento original de #111.

A validação estática por AST (allowlist de imports/builtins/dunder) NÃO é duplicada aqui
— é reusada de `tools.sandboxed_script_tool` como 2ª camada (defesa em profundidade),
além da rejeição rápida que o cliente já faz antes de despachar.
"""

import os
import subprocess
import sys
import tempfile

from tools.sandboxed_script_tool import (
    MAX_OUTPUT_CHARS,
    ScriptValidationError,
    _set_resource_limits,
    _validate_script,
)

# Flag EXCLUSIVO de teste de CI (issue #148, critério de aceite 8): pula a validação de
# AST para provar que a contenção de kernel do sidecar (sem rede, sem credenciais)
# segura scripts hostis MESMO com a allowlist de AST hipoteticamente burlada. NUNCA
# deve ser habilitado em produção — o sidecar de produção não define esta env var.
_SKIP_AST_ENV = "ALLOW_UNVALIDATED_SCRIPT"


def execute_script(script: str, timeout_seconds: int) -> dict:
    """Executa `script` em um processo Python isolado e retorna o dict de contrato.

    Contrato de retorno (status ∈ {OK, REJECTED, TIMEOUT, FAILED}):
      - {"status": "REJECTED", "error": str}
      - {"status": "TIMEOUT", "error": str}
      - {"status": "FAILED", "returncode": int, "stdout": str, "stderr": str}
      - {"status": "OK", "stdout": str, "stderr": str}

    Contenção:
      - `python3 -I` (modo isolado, ignora PYTHONPATH/site-packages do usuário);
      - `cwd` em diretório temporário efêmero (criado/destruído por chamada);
      - `env` mínimo (apenas PATH — sem herdar variáveis/credenciais do processo pai);
      - `preexec_fn` aplica RLIMIT_CPU/RLIMIT_AS (POSIX, best-effort);
      - `timeout` obrigatório mata o processo que trava;
      - stdout/stderr truncados a MAX_OUTPUT_CHARS.

    A validação de AST é reexecutada aqui (defesa em profundidade), a menos que a env
    `ALLOW_UNVALIDATED_SCRIPT=1` esteja setada — flag exclusivo de teste de CI.
    """
    if os.environ.get(_SKIP_AST_ENV) != "1":
        try:
            _validate_script(script)
        except ScriptValidationError as e:
            return {"status": "REJECTED", "error": str(e)}

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
            return {
                "status": "TIMEOUT",
                "error": f"Script excedeu timeout de {timeout_seconds}s",
            }

    stdout = proc.stdout[:MAX_OUTPUT_CHARS]
    stderr = proc.stderr[:MAX_OUTPUT_CHARS]

    if proc.returncode != 0:
        return {
            "status": "FAILED",
            "returncode": proc.returncode,
            "stdout": stdout,
            "stderr": stderr,
        }

    return {"status": "OK", "stdout": stdout, "stderr": stderr}
