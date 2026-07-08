"""
Verificação de isolamento de kernel do sidecar `script-executor` (issue #148).

Executado no job `e2e-integration` do CI, DENTRO do container `script-executor`, via:

    docker compose ... exec -T -e ALLOW_UNVALIDATED_SCRIPT=1 -e PYTHONPATH=/app/src \
        script-executor python - < tests/e2e/sidecar_isolation_check.py

Prova que a contenção do sidecar segura scripts hostis MESMO com a allowlist de AST
hipoteticamente burlada: `ALLOW_UNVALIDATED_SCRIPT=1` (flag EXCLUSIVO de teste — o
sidecar de produção NUNCA a define) pula a validação de AST, de modo que os scripts
crus abaixo chegam ao processo isolado. O que os segura é apenas o endurecimento do
container: rede `internal` (sem rota/DNS até outros serviços nem à internet) e ausência
de credenciais montadas.
"""

from sandbox.executor_core import execute_script

# 1) Egress de rede deve FALHAR: o sidecar está só na rede `internal`, sem rota nem
#    DNS até embedding-service.
NET_SCRIPT = (
    "import socket\n"
    "s = socket.socket()\n"
    "s.settimeout(3)\n"
    's.connect(("embedding-service", 8000))\n'
    'print("CONNECTED")'
)
net = execute_script(NET_SCRIPT, 8)
assert net["status"] in ("FAILED", "TIMEOUT"), net
assert "CONNECTED" not in net.get("stdout", ""), net
print("network egress blocked:", net["status"])

# 2) Credenciais GCP NÃO existem no sidecar (nenhum adc.json montado).
cred = execute_script('print(open("/gcloud/adc.json").read())', 5)
assert cred["status"] == "FAILED", cred
print("credentials absent: FAILED as expected")

print("ISOLATION OK")
