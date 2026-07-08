"""
Servidor HTTP mínimo do sidecar `script-executor` (issue #148).

Usa `http.server` da stdlib — zero dependências novas. Roda em um container
endurecido: usuário não-root, sem credenciais GCP, sem egress de rede (rede docker
`internal`), rootfs read-only e tmpfs zerado por execução para o workdir.

Endpoints:
  - `POST /run`    body `{"script": str, "timeout_seconds": int}` -> dict de contrato
                   (mesmo shape de `sandbox.executor_core.execute_script`).
  - `GET  /health` -> `{"status": "ok"}` (usado pelo healthcheck do compose).
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Coloca `src` no sys.path para reusar `tools/` e `sandbox/` — mesmo padrão de main.py.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sandbox.executor_core import execute_script  # noqa: E402

DEFAULT_TIMEOUT_SECONDS = 5
MAX_TIMEOUT_SECONDS = 30
MAX_BODY_BYTES = 1024 * 1024  # 1MB — scripts são curtos por definição.


class _Handler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802 - assinatura da BaseHTTPRequestHandler
        if self.path == "/health":
            self._send_json(200, {"status": "ok"})
        else:
            self._send_json(404, {"status": "FAILED", "error": "not found"})

    def do_POST(self):  # noqa: N802 - assinatura da BaseHTTPRequestHandler
        if self.path != "/run":
            self._send_json(404, {"status": "FAILED", "error": "not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
        except (TypeError, ValueError):
            length = 0
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send_json(
                400, {"status": "FAILED", "error": "invalid Content-Length"}
            )
            return

        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            script = data["script"]
        except (ValueError, KeyError, UnicodeDecodeError) as e:
            self._send_json(400, {"status": "FAILED", "error": f"invalid request: {e}"})
            return

        try:
            timeout_seconds = max(
                1,
                min(
                    int(data.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)),
                    MAX_TIMEOUT_SECONDS,
                ),
            )
        except (TypeError, ValueError):
            timeout_seconds = DEFAULT_TIMEOUT_SECONDS

        result = execute_script(script, timeout_seconds)
        self._send_json(200, result)

    def log_message(self, fmt, *args):
        # Silencia o log por-request (previsível em CI); erros ainda sobem como exceção.
        pass


def main():
    host = os.environ.get("SCRIPT_EXECUTOR_HOST", "0.0.0.0")
    port = int(os.environ.get("SCRIPT_EXECUTOR_PORT", "8000"))
    server = ThreadingHTTPServer((host, port), _Handler)
    print(f"[script-executor] listening on {host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
