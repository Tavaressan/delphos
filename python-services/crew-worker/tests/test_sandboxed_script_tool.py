"""
Testes da SandboxedScriptTool (issue #111).

Cobre os 4 cenários de aceite descritos na issue:
1. Execução bem-sucedida de um script simples.
2. Timeout de script que trava/loop infinito.
3. Rejeição de import/comando fora da allowlist.
4. Tentativa de acesso a recursos fora do sandbox (arquivo do sistema, escape via
   atributos dunder).
"""

import json
import sys

sys.path.insert(0, "src")

from tools.sandboxed_script_tool import SandboxedScriptTool  # noqa: E402


def _run(script, **kwargs):
    tool = SandboxedScriptTool()
    return json.loads(tool.run(script=script, **kwargs))


def test_successful_execution_of_simple_script():
    result = _run("print(1 + 1)")
    assert result["status"] == "OK"
    assert result["stdout"] == "2\n"


def test_script_that_hangs_is_killed_on_timeout():
    result = _run("while True:\n    pass", timeout_seconds=1)
    assert result["status"] == "TIMEOUT"
    assert "timeout" in result["error"].lower() or "excedeu" in result["error"].lower()


def test_import_outside_allowlist_is_rejected():
    result = _run("import os\nprint(os.getcwd())")
    assert result["status"] == "REJECTED"
    assert "os" in result["error"]


def test_subprocess_import_is_rejected():
    result = _run("import subprocess\nsubprocess.run(['ls'])")
    assert result["status"] == "REJECTED"


def test_socket_import_is_rejected():
    result = _run("import socket\nsocket.socket()")
    assert result["status"] == "REJECTED"


def test_open_builtin_is_rejected():
    """Tentativa de acesso a recursos fora do sandbox (arquivo do sistema)."""
    result = _run("print(open('/etc/passwd').read())")
    assert result["status"] == "REJECTED"
    assert "open" in result["error"]


def test_dunder_sandbox_escape_is_rejected():
    """Tentativa clássica de escape de sandbox Python via atributos dunder."""
    result = _run("print(().__class__.__bases__[0].__subclasses__())")
    assert result["status"] == "REJECTED"


def test_eval_and_exec_are_rejected():
    assert _run("eval('1+1')")["status"] == "REJECTED"
    assert _run("exec('print(1)')")["status"] == "REJECTED"


def test_output_is_truncated_to_max_chars():
    from tools.sandboxed_script_tool import MAX_OUTPUT_CHARS

    script = "print('a' * 10000)"
    result = _run(script)
    assert result["status"] == "OK"
    assert len(result["stdout"]) <= MAX_OUTPUT_CHARS


def test_allowed_import_executes_normally():
    result = _run("import math\nprint(math.sqrt(16))")
    assert result["status"] == "OK"
    assert result["stdout"].strip() == "4.0"
