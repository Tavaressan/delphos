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
#   scp -i <key>.pem scripts/ci-runner-ec2-bootstrap.sh scripts/ec2-idle-stop.sh ubuntu@<IP>:~/
#   scp -i <key>.pem <app-private-key>.pem ubuntu@<IP>:~/gh-app-key.pem
#   ssh -i <key>.pem ubuntu@<IP>
#   sudo bash ci-runner-ec2-bootstrap.sh
#
# Depois disso, a instância pode ser parada (`aws ec2 stop-instances`) e
# religada (`aws ec2 start-instances`) quantas vezes for preciso — os
# runners sobem sozinhos a cada boot (systemd) e a instância se autodesliga
# depois de ociosa (systemd timer), sem precisar rodar este script de novo.
#
# Decisão (issue #349): manter o modelo de auto-stop por ociosidade (em vez
# de deixar a instância sempre ligada 24/7 — trade-off de custo indesejado
# dado o crédito AWS limitado, ver comentário no topo) mas corrigir a
# heurística de ociosidade, que estava desligando a instância cedo demais
# (ver scripts/ec2-idle-stop.sh para o detalhe do bug e do fix). O efeito
# esperado é reduzir a frequência de cold-boot (~180-200s) sem manter a
# instância ligada indefinidamente.

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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDLE_STOP_SRC="${IDLE_STOP_SRC:-$SCRIPT_DIR/ec2-idle-stop.sh}"
if [ ! -f "$IDLE_STOP_SRC" ]; then
  echo "ec2-idle-stop.sh não encontrado em $IDLE_STOP_SRC — copie-o junto via scp (ver Uso acima)." >&2
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
# Copiado de scripts/ec2-idle-stop.sh (issue #349) em vez de gerado inline
# via heredoc — mantém a lógica testável isoladamente (ver
# ci-runner-ec2-idle-stop.test.sh) e evita duplicar o fix em dois lugares.
cp "$IDLE_STOP_SRC" /usr/local/bin/ec2-idle-stop.sh
chmod 755 /usr/local/bin/ec2-idle-stop.sh

cat > /etc/systemd/system/ec2-idle-stop.service <<UNIT
[Unit]
Description=Autodesliga a instancia se ociosa (sem job de CI rodando)

[Service]
Type=oneshot
Environment=IDLE_THRESHOLD_PCT=${IDLE_THRESHOLD_PCT}
Environment=GRACE_MIN=${GRACE_MIN}
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
