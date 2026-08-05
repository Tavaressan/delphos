#!/usr/bin/env bash
# ci-local.sh — replica localmente os jobs nativos + docker build (sem push) do
# .github/workflows/ci.yml, para feedback rápido antes de push enquanto o CI
# hospedado pelo GitHub está indisponível (ou só para checar mais rápido).
#
# NÃO cobre o job e2e-integration (docker-compose completo) — fora de escopo
# deliberado; se precisar validar E2E, rode manualmente:
#   docker compose -f docker-compose.yml -f docker-compose.ci-ports.yml up --wait
#
# Uso:
#   scripts/ci-local.sh [--all] [--base <ref>] [worktree_path]
#
#   --all           roda todos os módulos, ignorando o diff (útil para checar
#                    um worktree do zero em .claude/worktrees/*)
#   --base <ref>    ref para calcular o diff de módulos alterados (default: origin/master)
#   worktree_path   diretório a entrar antes de rodar (default: diretório atual)

set -uo pipefail

ALL=false
BASE="origin/master"
WORKTREE="."

while [ $# -gt 0 ]; do
  case "$1" in
    --all) ALL=true; shift ;;
    --base) BASE="$2"; shift 2 ;;
    *) WORKTREE="$1"; shift ;;
  esac
done

cd "$WORKTREE"

# ── 1. Detectar módulos alterados via `turbo ls --affected` (mesmo motor do
#      job `changes` no ci.yml — elimina a duplicação de detecção que
#      motivou a adoção do Turborepo) ────────────────────────────────────────
if $ALL; then
  RUST=true; JAVA=true; FRONTEND=true; PYTHON=true
else
  CHANGED=$(git diff --name-only "$BASE"...HEAD)
  # Mudança no próprio ci.yml: roda tudo (mesmo fail-safe do job `changes`,
  # issue #87) — ci.yml não é um pacote do workspace, o turbo não o veria.
  if echo "$CHANGED" | grep -q '^\.github/workflows/ci\.yml$'; then
    RUST=true; JAVA=true; FRONTEND=true; PYTHON=true
  else
    AFFECTED_JSON=$(TURBO_SCM_BASE="$BASE" npx --yes turbo@2.10.8 ls --affected --output=json | sed -n '/^{/,$p')
    RUST=$(echo "$AFFECTED_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if any(p['path']=='rust-services' for p in d['packages']['items']) else 'false')")
    JAVA=$(echo "$AFFECTED_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if any(p['path']=='java-core' for p in d['packages']['items']) else 'false')")
    FRONTEND=$(echo "$AFFECTED_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if any(p['path']=='frontend' for p in d['packages']['items']) else 'false')")
    PYTHON=$(echo "$AFFECTED_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if any(p['path']=='python-services/crew-worker' for p in d['packages']['items']) else 'false')")
  fi
fi

declare -A RESULTS

run_step() {
  local name="$1"; shift
  echo "==> $name"
  if "$@"; then
    RESULTS["$name"]="PASS"
  else
    RESULTS["$name"]="FAIL"
  fi
}

# ── 2. Checks nativos (sem Docker), espelhando ci.yml passo a passo ──────────
if $RUST; then
  run_step "rust-check:fmt"         bash -c 'cd rust-services && cargo fmt --all -- --check'
  run_step "rust-check:cargo-check" bash -c 'cd rust-services && cargo check --workspace'
  run_step "rust-check:clippy"      bash -c 'cd rust-services && cargo clippy --workspace -- -D warnings'
  run_step "rust-check:nextest"     bash -c 'cd rust-services && cargo nextest run --workspace'
else
  RESULTS["rust-check"]="SKIP"
fi

if $JAVA; then
  run_step "java-check:build" bash -c 'cd java-core && ./gradlew compileJava compileTestJava bootJar'
  run_step "java-check:test"  bash -c 'cd java-core && ./gradlew test'
  run_step "java-check:flyway" bash -c 'cd java-core && jar tf build/libs/*.jar | grep -q "db/migration/V"'
  run_step "java-integration" bash -c 'cd java-core && ./gradlew integrationTest'
else
  RESULTS["java-check"]="SKIP"
  RESULTS["java-integration"]="SKIP"
fi

if $FRONTEND; then
  run_step "frontend-check:install" bash -c 'cd frontend && deno install'
  run_step "frontend-check:lint"    bash -c 'cd frontend && deno task lint'
  run_step "frontend-check:test"    bash -c 'cd frontend && deno task test'
  run_step "frontend-check:build"   bash -c 'cd frontend && deno task build'
else
  RESULTS["frontend-check"]="SKIP"
fi

if $PYTHON; then
  run_step "python-ci:flake8-errors" flake8 python-services --count --select=E9,F63,F7,F82 --show-source --statistics
  flake8 python-services --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
  black --check --diff python-services || echo "AVISO: drift de formatação (não-bloqueante, igual ao CI)"
  run_step "python-ci:pytest" bash -c 'pytest python-services --ignore=python-services/crew-worker/.venv || [ $? -eq 5 ]'
else
  RESULTS["python-ci"]="SKIP"
fi

# ── 3. docker build (sem push), espelhando as matrizes/contextos dos docker-build-* ──
if $RUST; then
  for svc in embedding-service ingestion-worker rag-worker workflow-worker; do
    run_step "docker-build-rust:$svc" docker build -f "rust-services/$svc/Dockerfile" rust-services
  done
fi

if $JAVA; then
  run_step "docker-build-java" docker build -f java-core/Dockerfile java-core
fi

if $FRONTEND; then
  run_step "docker-build-frontend" docker build -f frontend/Dockerfile .
fi

if $PYTHON; then
  run_step "docker-build-python"          docker build -f python-services/crew-worker/Dockerfile python-services/crew-worker
  run_step "docker-build-python-executor" docker build -f python-services/crew-worker/Dockerfile.executor python-services/crew-worker
fi

# ── 4. Sumário ─────────────────────────────────────────────────────────────
echo ""
echo "=== ci-local.sh summary ==="
OVERALL=0
for k in "${!RESULTS[@]}"; do
  printf '%-30s %s\n' "$k" "${RESULTS[$k]}"
  [ "${RESULTS[$k]}" = "FAIL" ] && OVERALL=1
done
echo "e2e-integration:               SKIPPED (fora de escopo — 'docker compose up' manual se necessário)"

exit $OVERALL
