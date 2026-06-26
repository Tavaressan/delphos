#!/bin/bash
# Preflight: valida credenciais Google Cloud antes de docker compose up.
# Execute antes de subir a stack: ./scripts/check-gcp.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() { echo -e "${RED}ERRO: $1${NC}" >&2; exit 1; }
warn() { echo -e "${YELLOW}AVISO: $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }

echo "Verificando credenciais Google Cloud..."

# 1. Tentar ler ADC_PATH do .env se não estiver no ambiente
if [ -z "${ADC_PATH:-}" ] && [ -f .env ]; then
    ADC_PATH=$(grep -E '^ADC_PATH=' .env | head -1 | cut -d= -f2-)
fi

if [ -z "${ADC_PATH:-}" ]; then
    fail "ADC_PATH não está definido.\n\nConfigure em .env:\n  macOS/Linux: ADC_PATH=\$HOME/.config/gcloud/application_default_credentials.json\n  Windows:     ADC_PATH=C:/Users/<usuario>/AppData/Roaming/gcloud/application_default_credentials.json\n\nDepois execute: gcloud auth application-default login"
fi

if [[ "$ADC_PATH" == *"caminho/para"* ]] || [[ "$ADC_PATH" == *"<"* ]]; then
    fail "ADC_PATH contém valor de exemplo: '${ADC_PATH}'\nSubstitua pelo caminho real do arquivo de credenciais."
fi

# 2. Verificar se o arquivo existe
[ -f "$ADC_PATH" ] || fail "Arquivo de credenciais não encontrado: ${ADC_PATH}\n\nExecute: gcloud auth application-default login"

# 3. Verificar JSON válido
python3 -c "import json,sys; json.load(open('${ADC_PATH}'))" 2>/dev/null \
    || fail "Arquivo não é JSON válido: ${ADC_PATH}"

# 4. Verificar tipo de credencial
CRED_TYPE=$(python3 -c "import json; print(json.load(open('${ADC_PATH}')).get('type','desconhecido'))" 2>/dev/null)

case "$CRED_TYPE" in
    authorized_user)
        warn "Credencial de usuário pessoal (ADC). Adequado para dev local."
        warn "Para produção use um Service Account JSON com permissão 'Vertex AI User'."
        ;;
    service_account)
        SA_EMAIL=$(python3 -c "import json; print(json.load(open('${ADC_PATH}')).get('client_email','?'))" 2>/dev/null)
        ok "Service Account: ${SA_EMAIL}"
        ;;
    *)
        warn "Tipo de credencial desconhecido: '${CRED_TYPE}'"
        ;;
esac

# 5. Verificar GCP_PROJECT_ID
GCP_PROJECT="${GCP_PROJECT_ID:-}"
if [ -z "$GCP_PROJECT" ] && [ -f .env ]; then
    GCP_PROJECT=$(grep -E '^GCP_PROJECT_ID=' .env | head -1 | cut -d= -f2-)
fi
[ -n "$GCP_PROJECT" ] || fail "GCP_PROJECT_ID não está definido em .env"
ok "Projeto GCP: ${GCP_PROJECT}"

# 6. Verificar GCP_LOCATION
GCP_LOC="${GCP_LOCATION:-}"
if [ -z "$GCP_LOC" ] && [ -f .env ]; then
    GCP_LOC=$(grep -E '^GCP_LOCATION=' .env | head -1 | cut -d= -f2- || echo "us-central1")
fi
ok "Região GCP: ${GCP_LOC:-us-central1 (default)}"

echo ""
ok "Credenciais GCP validadas. Pode executar: docker compose up -d"
