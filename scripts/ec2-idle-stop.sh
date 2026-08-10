#!/usr/bin/env bash
# ec2-idle-stop.sh — decide se a instância EC2 do runner de CI está
# genuinamente ociosa e, se sim, dispara `aws ec2 stop-instances`.
#
# Extraído de ci-runner-ec2-bootstrap.sh (issue #349) para ser testável de
# forma isolada — ver ci-runner-ec2-idle-stop.test.sh. Instalado via
# systemd timer (OnBootSec=${GRACE_MIN}min, OnUnitActiveSec=5min).
#
# Correção da issue #349: a versão anterior (embutida como heredoc dentro
# do bootstrap) usava a carga média de 1 MINUTO (campo 1 de /proc/loadavg)
# para decidir ociosidade. Como o timer roda a cada 5min, bastava UMA janela
# de 5min com pouca CPU logo após um job terminar para a instância ser
# desligada — o oposto do "idle-timeout de 15-30min" pretendido (ver issue
# #349, direção 1). Cold-boot subsequente custava ~180-200s (medido no run
# 30823116364), repetido a cada PR da fila serializada.
#
# Fix: usar a carga média de 15 MINUTOS (campo 3 de /proc/loadavg, já é uma
# EWMA nativa do kernel) em vez da de 1min. Isso exige ociosidade sustentada
# ao longo dos últimos ~15min antes de autodesligar, em vez de uma única
# amostra instantânea — sem precisar rastrear timestamp do último job.
#
# Variáveis injetáveis (default = comportamento real; override só em teste):
#   PROC_UPTIME       - path para /proc/uptime (default: /proc/uptime)
#   PROC_LOADAVG      - path para /proc/loadavg (default: /proc/loadavg)
#   LOAD_AVG_FIELD    - campo de /proc/loadavg a usar (1=1min, 2=5min,
#                        3=15min; default: 3)
#   AWS_BIN           - binário aws a invocar (default: /usr/local/bin/aws)
#   IDLE_THRESHOLD_PCT - limiar de carga (%) abaixo do qual considera ocioso
#   GRACE_MIN         - minutos de uptime antes de sequer checar ociosidade
#   NCPU_OVERRIDE     - nº de vCPUs a usar em vez de `nproc` (só em teste;
#                        `nproc` não existe em macOS, usado pelo dev local)
#   METADATA_TOKEN_URL, METADATA_INSTANCE_ID_URL, METADATA_REGION_URL - URLs
#                        do IMDSv2 (default: endpoint real 169.254.169.254;
#                        override em teste evita chamada de rede real)

set -euo pipefail

PROC_UPTIME="${PROC_UPTIME:-/proc/uptime}"
PROC_LOADAVG="${PROC_LOADAVG:-/proc/loadavg}"
LOAD_AVG_FIELD="${LOAD_AVG_FIELD:-3}"
AWS_BIN="${AWS_BIN:-/usr/local/bin/aws}"
IDLE_THRESHOLD_PCT="${IDLE_THRESHOLD_PCT:-3}"
GRACE_MIN="${GRACE_MIN:-15}"

UPTIME_MIN=$(awk '{print int($1/60)}' "$PROC_UPTIME")
if [ "$UPTIME_MIN" -lt "$GRACE_MIN" ]; then
  exit 0
fi

NCPU="${NCPU_OVERRIDE:-$(nproc)}"
LOAD=$(awk -v f="$LOAD_AVG_FIELD" '{print $f}' "$PROC_LOADAVG")
BUSY_PCT=$(awk -v l="$LOAD" -v n="$NCPU" 'BEGIN{printf "%.0f", (l/n)*100}')

if [ "$BUSY_PCT" -lt "$IDLE_THRESHOLD_PCT" ]; then
  TOKEN_URL="${METADATA_TOKEN_URL:-http://169.254.169.254/latest/api/token}"
  IID_URL="${METADATA_INSTANCE_ID_URL:-http://169.254.169.254/latest/meta-data/instance-id}"
  REGION_URL="${METADATA_REGION_URL:-http://169.254.169.254/latest/meta-data/placement/region}"
  TOKEN=$(curl -s --max-time 5 -X PUT "$TOKEN_URL" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  IID=$(curl -s --max-time 5 -H "X-aws-ec2-metadata-token: $TOKEN" "$IID_URL")
  REGION=$(curl -s --max-time 5 -H "X-aws-ec2-metadata-token: $TOKEN" "$REGION_URL")
  echo "Ocioso ha >= ${GRACE_MIN}min (carga ${BUSY_PCT}% < ${IDLE_THRESHOLD_PCT}%) - autodesligando $IID"
  "$AWS_BIN" ec2 stop-instances --instance-ids "$IID" --region "$REGION"
fi
