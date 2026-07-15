#!/usr/bin/env bash
# Sincroniza a cópia vendorizada de .claude-plugin/vendor/vetor a partir do marketplace
# remoto (github.com/Tavaressan/Vetor), instalado em escopo "user" nesta máquina.
#
# Uso:
#   ./.claude-plugin/update-vendor.sh
#
# Depois de rodar, revise o diff, ajuste a "version" em .claude-plugin/marketplace.json
# e commite em uma branch de feature (nunca direto em master).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DEST="$REPO_ROOT/.claude-plugin/vendor/vetor"
CACHE_ROOT="$HOME/.claude/plugins/cache/vetor/vetor"

echo "Atualizando marketplace remoto 'vetor'..."
claude plugin marketplace update vetor

LATEST_DIR="$(ls -td "$CACHE_ROOT"/*/ 2>/dev/null | head -1)"
if [ -z "$LATEST_DIR" ]; then
  echo "Erro: nenhuma versão encontrada em $CACHE_ROOT. O plugin 'vetor' está instalado em escopo user?" >&2
  exit 1
fi

LATEST_VERSION="$(basename "$LATEST_DIR")"
echo "Versão mais recente no cache local: $LATEST_VERSION"

rsync -a --delete \
  --exclude='.in_use' \
  --exclude='AGENT_STATUS.md' \
  --exclude='.claude/vetor/status/' \
  "$LATEST_DIR" "$VENDOR_DEST/"

echo "Vendorizado a partir de: $LATEST_DIR"
echo ""
echo "Próximos passos manuais:"
echo "  1. Atualize \"version\": \"$LATEST_VERSION\" em .claude-plugin/marketplace.json"
echo "  2. git diff .claude-plugin/vendor/vetor para revisar as mudanças"
echo "  3. Commite em uma branch de feature (ex.: chore/vetor-vendor-update)"
