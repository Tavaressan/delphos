#!/usr/bin/env bash
# check-migrations.sh — Flyway migration validation (chamado pelo pre-commit)
#
# Verifica arquivos V*.sql no staging area quanto a:
#   1. Path correto (java-core/src/main/resources/db/migration/)
#   2. Convenção de nome Flyway: V{numero}__{descricao}.sql (dois underscores)
#   3. Versão duplicada (incluindo arquivos já existentes no filesystem)
#   4. Lacuna de versão (aviso, não bloqueia)

set -euo pipefail

MIGRATION_DIR="java-core/src/main/resources/db/migration"
ERRORS=0

# ── 1. Coletar arquivos de migration staged ───────────────────────────────────
STAGED_MIGRATIONS=$(git diff --cached --name-only | grep -E 'V[0-9]+.*\.sql$' || true)

if [ -z "$STAGED_MIGRATIONS" ]; then
  exit 0
fi

# ── 2. Versão máxima atual no filesystem ─────────────────────────────────────
MAX_VERSION=$(find "$MIGRATION_DIR" -maxdepth 1 -name 'V*.sql' 2>/dev/null \
  | sed -E 's|.*/V([0-9]+)__.*\.sql|\1|' \
  | sort -n \
  | tail -1)
MAX_VERSION=${MAX_VERSION:-0}

# ── 3. Validar cada arquivo staged ───────────────────────────────────────────
for FILE in $STAGED_MIGRATIONS; do
  BASENAME=$(basename "$FILE")

  echo "  Verificando: $FILE"

  # 3a. Path correto
  if [[ "$FILE" != "$MIGRATION_DIR/"* ]]; then
    echo "  ✗ ERRO: migration deve estar em '$MIGRATION_DIR/'"
    echo "    Encontrado: $FILE"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # 3b. Convenção de nome: V{numero}__{descricao}.sql (dois underscores)
  if ! echo "$BASENAME" | grep -qE '^V[0-9]+__[^_].*\.sql$'; then
    echo "  ✗ ERRO: nome não segue a convenção Flyway V{numero}__{descricao}.sql"
    echo "    Encontrado: $BASENAME"
    echo "    Exemplo correto: V9__add_users_table.sql  (dois underscores após a versão)"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Extrair número de versão
  STAGED_VERSION=$(echo "$BASENAME" | sed -E 's/^V([0-9]+)__.*/\1/')

  # 3c. Versão duplicada (exclui o próprio arquivo staged caso já exista no disco)
  DUPLICATE=$(find "$MIGRATION_DIR" -maxdepth 1 -name "V${STAGED_VERSION}__*.sql" 2>/dev/null \
    | grep -v "$(basename "$FILE")" || true)

  if [ -n "$DUPLICATE" ]; then
    echo "  ✗ ERRO: versão V${STAGED_VERSION} já existe no filesystem:"
    echo "    Existente: $DUPLICATE"
    echo "    Staged:    $FILE"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # 3d. Lacuna de versão (apenas aviso)
  EXPECTED_NEXT=$((MAX_VERSION + 1))
  if [ "$STAGED_VERSION" -gt "$EXPECTED_NEXT" ]; then
    echo "  ⚠ AVISO: lacuna de versão detectada — esperado V${EXPECTED_NEXT}__, encontrado V${STAGED_VERSION}__"
    echo "    Isso pode quebrar a validação sequencial do Flyway se outOfOrder=false."
  fi

done

# ── 4. Resultado final ────────────────────────────────────────────────────────
if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "✗ Flyway migration check FALHOU ($ERRORS erro(s)). Commit abortado."
  exit 1
fi

echo "✓ Migration checks passed"
exit 0
