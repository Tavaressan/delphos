#!/usr/bin/env bash
# ci-runner-ec2-bootstrap.sh — provisiona runners self-hosted EFÊMEROS numa
# instância EC2, com auto-desligamento por ociosidade (operação sustentável
# do crédito AWS até a expiração — ver docker-compose.ci-runner.yml para o
# modelo local "sempre ligado", que continua em uso em paralelo no Mac).
#
# Rodar UMA VEZ via SSH, como root (sudo), logo após o primeiro boot da
# instância. Idempotente — pode rodar de novo com segurança se precisar
# reaplicar (ex.: trocar RUNNER_COUNT).
#
# Uso:
#   scp -i <key>.pem scripts/ci-runner-ec2-bootstrap.sh ubuntu@<IP>:~/
#   scp -i <key>.pem <app-private-key>.pem ubuntu@<IP>:~/gh-app-key.pem
#   ssh -i <key>.pem ubuntu@<IP>
#   sudo bash ci-runner-ec2-bootstrap.sh
#
# Depois disso, a instância pode ser parada (`aws ec2 stop-instances`) e
# religada (`aws ec2 start-instances`) quantas vezes for preciso — os
# runners sobem sozinhos a cada boot (systemd) e a instância se autodesliga
# depois de ociosa (systemd timer), sem precisar rodar este script de novo.

set -euo pipefail

RUNNER_COUNT="${RUNNER_COUNT:-2}"
REPO_URL="https://github.com/Tavaressan/Alfabra-Vector"
APP_ID="4358824"
APP_LOGIN="Tavaressan"
KEY_SRC="${KEY_SRC:-/home/ubuntu/gh-app-key.pem}"
IDLE_THRESHOLD_PCT="${IDLE_THRESHOLD_PCT:-3}"
GRACE_MIN="${GRACE_MIN:-15}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode como root (sudo bash $0)" >&2
  exit 1
fi

if [ ! -f "$KEY_SRC" ]; then
  echo "Private key da GitHub App não encontrada em $KEY_SRC — copie antes via scp." >&2
  exit 1
fi

echo "==> Instalando Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Instalando AWS CLI (necessário pro auto-stop)"
if ! command -v aws >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y unzip curl
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q -o /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
fi

echo "==> Guardando a private key da GitHub App em /etc/gh-runner/"
mkdir -p /etc/gh-runner
cp "$KEY_SRC" /etc/gh-runner/app-key.pem
chmod 600 /etc/gh-runner/app-key.pem

echo "==> Instalando wrapper de start (evita expor a private key via argv/ps)"
cat > /usr/local/bin/gh-runner-start.sh <<WRAPPER
#!/usr/bin/env bash
# A private key é lida para dentro do ambiente deste processo (export) e
# repassada ao docker via "-e APP_PRIVATE_KEY" sem valor inline — assim ela
# nunca aparece no argv do docker/systemd (visível via ps/systemctl status),
# só em /proc/<pid>/environ, que já é restrito a root/mesmo usuário.
set -euo pipefail
INDEX="\$1"
export APP_PRIVATE_KEY
APP_PRIVATE_KEY="\$(cat /etc/gh-runner/app-key.pem)"
exec docker run --rm --name "gh-runner-ec2-\${INDEX}" \\
  -e REPO_URL="${REPO_URL}" \\
  -e RUNNER_SCOPE=repo \\
  -e APP_ID="${APP_ID}" \\
  -e APP_LOGIN="${APP_LOGIN}" \\
  -e APP_PRIVATE_KEY \\
  -e RUNNER_NAME="alfabra-ec2-\${INDEX}" \\
  -e RUNNER_WORKDIR=/tmp/runner \\
  -e LABELS=alfabra-local \\
  -e EPHEMERAL=true \\
  -e TESTCONTAINERS_RYUK_DISABLED=true \\
  -v "/opt/gh-runner-work-\${INDEX}:/tmp/runner" \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  myoung34/github-runner:latest
WRAPPER
chmod 755 /usr/local/bin/gh-runner-start.sh

echo "==> Criando unit template systemd (runner efêmero, respawn automático)"
cat > /etc/systemd/system/gh-runner@.service <<UNIT
[Unit]
Description=Ephemeral GitHub Actions self-hosted runner (%i)
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
ExecStartPre=-/usr/bin/docker rm -f gh-runner-ec2-%i
ExecStart=/usr/local/bin/gh-runner-start.sh %i
ExecStop=/usr/bin/docker stop gh-runner-ec2-%i
Restart=always
RestartSec=3
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT

for i in $(seq 1 "$RUNNER_COUNT"); do
  mkdir -p "/opt/gh-runner-work-$i"
  systemctl enable "gh-runner@${i}.service"
done

echo "==> Instalando script de auto-desligamento por ociosidade"
cat > /usr/local/bin/ec2-idle-stop.sh <<SCRIPT
#!/usr/bin/env bash
# Heurístico simples: se a carga média (1min, normalizada por vCPU) ficar
# abaixo de ${IDLE_THRESHOLD_PCT}% depois dos primeiros ${GRACE_MIN}min de
# uptime, considera a instância ociosa (nenhum job rodando) e se autopara.
# A janela de 1min do load average já dá uma folga natural logo após um job
# terminar — não é um sinal exato, é aproximado de propósito (simplicidade).
set -euo pipefail

UPTIME_MIN=\$(awk '{print int(\$1/60)}' /proc/uptime)
if [ "\$UPTIME_MIN" -lt "${GRACE_MIN}" ]; then
  exit 0
fi

NCPU=\$(nproc)
LOAD1=\$(awk '{print \$1}' /proc/loadavg)
BUSY_PCT=\$(awk -v l="\$LOAD1" -v n="\$NCPU" 'BEGIN{printf "%.0f", (l/n)*100}')

if [ "\$BUSY_PCT" -lt "${IDLE_THRESHOLD_PCT}" ]; then
  TOKEN=\$(curl -sX PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  IID=\$(curl -s -H "X-aws-ec2-metadata-token: \$TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
  REGION=\$(curl -s -H "X-aws-ec2-metadata-token: \$TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
  echo "Ocioso ha >= ${GRACE_MIN}min (carga \${BUSY_PCT}% < ${IDLE_THRESHOLD_PCT}%) - autodesligando \$IID"
  /usr/local/bin/aws ec2 stop-instances --instance-ids "\$IID" --region "\$REGION"
fi
SCRIPT
chmod +x /usr/local/bin/ec2-idle-stop.sh

cat > /etc/systemd/system/ec2-idle-stop.service <<UNIT
[Unit]
Description=Autodesliga a instancia se ociosa (sem job de CI rodando)

[Service]
Type=oneshot
ExecStart=/usr/local/bin/ec2-idle-stop.sh
UNIT

cat > /etc/systemd/system/ec2-idle-stop.timer <<UNIT
[Unit]
Description=Roda a checagem de ociosidade a cada 5 minutos

[Timer]
OnBootSec=${GRACE_MIN}min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now ec2-idle-stop.timer
for i in $(seq 1 "$RUNNER_COUNT"); do
  systemctl restart "gh-runner@${i}.service"
done

echo "==> Pronto. Runners: gh-runner@1..${RUNNER_COUNT}. Auto-stop: ec2-idle-stop.timer."
echo "    Verificar: systemctl status 'gh-runner@*' ec2-idle-stop.timer"
