#!/usr/bin/env bash
# ci-runner-ec2-idle-stop.test.sh — teste de reprodução para a issue #349.
#
# Simula /proc/uptime e /proc/loadavg via arquivos fake e um binário `aws`
# stub para verificar se scripts/ec2-idle-stop.sh dispara stop-instances.
#
# Uso: bash scripts/ci-runner-ec2-idle-stop.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDLE_STOP="$SCRIPT_DIR/ec2-idle-stop.sh"

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

# Stub do `aws` cli: só registra se foi chamado (não faz chamada real).
AWS_STUB="$WORKDIR/aws"
cat > "$AWS_STUB" <<'EOF'
#!/usr/bin/env bash
echo "AWS_CALLED $*" >> "$AWS_CALL_LOG"
EOF
chmod +x "$AWS_STUB"

# Stub HTTP local para o metadata endpoint IMDSv2 (evita chamada de rede
# real a 169.254.169.254, que não existe fora de uma instância EC2) -
# responde qualquer path/método com um corpo fixo.
STUB_SERVER="$WORKDIR/metadata_stub.py"
cat > "$STUB_SERVER" <<'EOF'
import http.server
import sys

class Handler(http.server.BaseHTTPRequestHandler):
    def _reply(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"stub-value")
    def do_GET(self): self._reply()
    def do_PUT(self): self._reply()
    def log_message(self, *a): pass

http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), Handler).serve_forever()
EOF
METADATA_PORT=18765
python3 "$STUB_SERVER" "$METADATA_PORT" &
STUB_PID=$!
trap 'rm -rf "$WORKDIR"; kill "$STUB_PID" 2>/dev/null' EXIT
sleep 0.3

export METADATA_TOKEN_URL="http://127.0.0.1:${METADATA_PORT}/token"
export METADATA_INSTANCE_ID_URL="http://127.0.0.1:${METADATA_PORT}/instance-id"
export METADATA_REGION_URL="http://127.0.0.1:${METADATA_PORT}/region"

FAIL=0

run_case() {
  local name="$1" uptime_sec="$2" load1="$3" load5="$4" load15="$5" load_field="$6" expect_stop="$7"

  local uptime_file="$WORKDIR/uptime"
  local loadavg_file="$WORKDIR/loadavg"
  local call_log="$WORKDIR/calls.log"
  : > "$call_log"

  echo "$uptime_sec 0.0" > "$uptime_file"
  echo "$load1 $load5 $load15 1/1 1" > "$loadavg_file"

  PROC_UPTIME="$uptime_file" PROC_LOADAVG="$loadavg_file" LOAD_AVG_FIELD="$load_field" \
    AWS_BIN="$AWS_STUB" AWS_CALL_LOG="$call_log" NCPU_OVERRIDE=2 \
    bash "$IDLE_STOP" >/dev/null 2>&1 || true

  local called="false"
  if [ -s "$call_log" ]; then
    called="true"
  fi

  if [ "$called" != "$expect_stop" ]; then
    echo "FAIL: $name (esperado stop=$expect_stop, obtido stop=$called)"
    FAIL=1
  else
    echo "OK: $name"
  fi
}

# Caso 1 (bug reproduzido com a heurística ANTIGA - campo 1 = load de 1min):
# job pesado nos últimos 15min (load15 alto) mas uma janela de 1min calma
# logo após o job terminar (load1 baixo) — a lógica antiga (field=1) desliga
# a instância cedo demais, mesmo com atividade recente/sustentada.
run_case "campo 1min (comportamento antigo) desliga cedo demais" \
  1200 0.01 2.0 4.0 1 "true"

# Caso 2 (fix): mesma amostra, mas usando a média de 15min (field=3,
# default do script) — exige ociosidade sustentada, não desliga.
run_case "campo 15min (fix) nao desliga com atividade recente" \
  1200 0.01 2.0 4.0 3 "false"

# Caso 3: genuinamente ocioso ha mais de 15min (todas as janelas baixas) -
# ainda deve desligar mesmo com o fix.
run_case "campo 15min (fix) desliga quando genuinamente ocioso" \
  1200 0.01 0.01 0.01 3 "true"

# Caso 4: dentro do periodo de graca pos-boot (uptime < 15min) - nunca
# desliga, independente da carga.
run_case "dentro do grace period pos-boot nao desliga" \
  300 0.01 0.01 0.01 3 "false"

if [ "$FAIL" -ne 0 ]; then
  echo "--- FALHOU ---"
  exit 1
fi

echo "--- TODOS OS CASOS PASSARAM ---"
