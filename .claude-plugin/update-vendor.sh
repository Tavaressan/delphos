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

# O update do marketplace só atualiza o índice: a versão nova do plugin não é
# materializada em CACHE_ROOT até um update do próprio plugin. Sem este passo o
# script sincroniza silenciosamente a versão anterior. O nome precisa ser
# qualificado — "claude plugin update vetor" falha com "Plugin not found".
echo "Materializando a versão nova no cache do plugin..."
claude plugin update vetor@vetor

# Seleciona por ordem de versão, não por mtime: uma versão antiga rematerializada
# depois tem mtime maior e venceria a ordenação por data.
LATEST_VERSION="$(ls -1 "$CACHE_ROOT" 2>/dev/null | sort -V | tail -1)"
if [ -z "$LATEST_VERSION" ]; then
  echo "Erro: nenhuma versão encontrada em $CACHE_ROOT. O plugin 'vetor' está instalado em escopo user?" >&2
  exit 1
fi
LATEST_DIR="$CACHE_ROOT/$LATEST_VERSION"
echo "Versão mais recente no cache local: $LATEST_VERSION"

# Equivalente portável a "rsync -a --delete --exclude=...": o Git Bash do Windows
# não traz rsync. Espelha o source apagando o destino antes de copiar; os caminhos
# excluídos são removidos da cópia depois.
rm -rf "$VENDOR_DEST"
mkdir -p "$VENDOR_DEST"
cp -a "$LATEST_DIR/." "$VENDOR_DEST/"
rm -rf "$VENDOR_DEST/.in_use" \
       "$VENDOR_DEST/AGENT_STATUS.md" \
       "$VENDOR_DEST/.claude/vetor/status"

echo "Vendorizado a partir de: $LATEST_DIR"
echo ""
echo "Próximos passos manuais:"
echo "  1. Atualize \"version\": \"$LATEST_VERSION\" em .claude-plugin/marketplace.json"
echo "  2. git diff .claude-plugin/vendor/vetor para revisar as mudanças"
echo "  3. Commite em uma branch de feature (ex.: chore/vetor-vendor-update)"
