#!/usr/bin/env bash
# demo-agents.sh — roteiro de demonstração dos 4 agentes mockados
# (compliance, piso, catálogo, orquestrador).
#
# O que faz:
#   1. Garante que os 4 agentes mockados existem e estão publicados
#      (reaproveita python-services/crew-worker/src/seed_mock_agents.py,
#      que é idempotente — pode rodar este script várias vezes sem
#      criar agentes duplicados).
#   2. Envia uma pergunta de exemplo para cada agente através da API de
#      chat/execução do java-core (POST /api/executions + polling em
#      GET /api/executions/{id}) e imprime pergunta/resposta de cada um.
#
# Pré-requisitos:
#   - Stack local rodando: ./scripts/setup.sh (primeira vez) ou
#     ./scripts/dev.sh / docker compose up -d
#   - java-core acessível (padrão http://localhost:8080)
#   - Para respostas determinísticas sem credenciais reais do Vertex AI,
#     defina CREW_WORKER_MODE=mock no ambiente do crew-worker (ver
#     docker-compose.yml / .env.example). O script também funciona sem
#     alterações contra uma stack com credenciais reais configuradas —
#     nesse caso as respostas deixam de ser mockadas.
#   - Python 3 com a dependência "requests" instalada (já é dependência
#     transitiva do crew-worker; se necessário: pip install requests)
#
# Uso:
#   ./scripts/demo-agents.sh [--base-url http://localhost:8080] [--tenant-id <uuid>] [--timeout 60]
#
# Todos os argumentos são repassados para src/demo_agents.py.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREW_WORKER_DIR="$REPO_ROOT/python-services/crew-worker"

if ! command -v python3 &>/dev/null; then
  echo "ERRO: python3 não encontrado no PATH." >&2
  exit 1
fi

cd "$CREW_WORKER_DIR"
exec python3 src/demo_agents.py "$@"
