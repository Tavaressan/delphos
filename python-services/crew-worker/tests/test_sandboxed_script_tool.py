"""
Testes da SandboxedScriptTool (issue #111 + roteamento para sidecar, issue #148).

Cobre os 4 cenários de aceite descritos na issue #111:
1. Execução bem-sucedida de um script simples.
2. Timeout de script que trava/loop infinito.
3. Rejeição de import/comando fora da allowlist.
4. Tentativa de acesso a recursos fora do sandbox (arquivo do sistema, escape via
   atributos dunder).

E, para a #148, verifica o roteamento HTTP ao sidecar `script-executor` (com o
transporte mockado) e o fallback in-process quando `SCRIPT_EXECUTOR_URL` não está
setado — sem subir Docker.
"""

import json
import sys
import urllib.error

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


# --- Roteamento para o sidecar script-executor (issue #148) -------------------


class _FakeResponse:
    """Simula o context manager retornado por urllib.request.urlopen."""

    def __init__(self, body: bytes):
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_run_routes_to_sidecar_when_executor_url_is_set(monkeypatch):
    """Com SCRIPT_EXECUTOR_URL setado, `_run` (i) envia {script, timeout_seconds}
    ao sidecar via HTTP e (ii) mapeia a resposta de volta ao contrato — sem
    executar nada in-process."""
    captured = {}

    def fake_urlopen(req, timeout=None):
        captured["url"] = req.full_url
        captured["method"] = req.get_method()
        captured["payload"] = json.loads(req.data.decode("utf-8"))
        captured["transport_timeout"] = timeout
        body = json.dumps({"status": "OK", "stdout": "42\n", "stderr": ""}).encode(
            "utf-8"
        )
        return _FakeResponse(body)

    monkeypatch.setenv("SCRIPT_EXECUTOR_URL", "http://script-executor:8000/run")
    monkeypatch.setattr(
        "tools.sandboxed_script_tool.urllib.request.urlopen", fake_urlopen
    )

    result = _run("print(6 * 7)", timeout_seconds=7)

    assert result == {"status": "OK", "stdout": "42\n", "stderr": ""}
    assert captured["url"] == "http://script-executor:8000/run"
    assert captured["method"] == "POST"
    assert captured["payload"] == {"script": "print(6 * 7)", "timeout_seconds": 7}
    # timeout de transporte = timeout do script + margem (5s).
    assert captured["transport_timeout"] == 7 + 5


def test_run_rejects_by_ast_before_contacting_sidecar(monkeypatch):
    """A allowlist de AST roda no cliente ANTES do despacho: um import proibido é
    REJECTED sem jamais tocar o sidecar."""

    def boom(req, timeout=None):
        raise AssertionError("sidecar não deveria ser contatado para script rejeitado")

    monkeypatch.setenv("SCRIPT_EXECUTOR_URL", "http://script-executor:8000/run")
    monkeypatch.setattr("tools.sandboxed_script_tool.urllib.request.urlopen", boom)

    result = _run("import os\nprint(os.getcwd())")
    assert result["status"] == "REJECTED"
    assert "os" in result["error"]


def test_sidecar_connection_failure_maps_to_failed_not_ok(monkeypatch):
    """Falha de transporte (conexão recusada) nunca vaza como OK: vira FAILED."""

    def refuse(req, timeout=None):
        raise urllib.error.URLError("Connection refused")

    monkeypatch.setenv("SCRIPT_EXECUTOR_URL", "http://script-executor:8000/run")
    monkeypatch.setattr("tools.sandboxed_script_tool.urllib.request.urlopen", refuse)

    result = _run("print(1)")
    assert result["status"] == "FAILED"
    assert "sidecar" in result["error"].lower()


def test_sidecar_transport_timeout_maps_to_timeout(monkeypatch):
    """Timeout de transporte é mapeado para status TIMEOUT (não FAILED/OK)."""

    def slow(req, timeout=None):
        raise TimeoutError("timed out")

    monkeypatch.setenv("SCRIPT_EXECUTOR_URL", "http://script-executor:8000/run")
    monkeypatch.setattr("tools.sandboxed_script_tool.urllib.request.urlopen", slow)

    result = _run("print(1)")
    assert result["status"] == "TIMEOUT"


def test_falls_back_to_in_process_when_no_executor_url(monkeypatch):
    """Sem SCRIPT_EXECUTOR_URL (dev/unit test), a execução acontece in-process via
    executor_core, mantendo o comportamento original de #111."""
    monkeypatch.delenv("SCRIPT_EXECUTOR_URL", raising=False)
    result = _run("print(2 + 3)")
    assert result["status"] == "OK"
    assert result["stdout"] == "5\n"
