#!/usr/bin/env bash
# ci-select-runner.test.sh — teste de reprodução para a issue #426.
#
# Simula os cenários de RUN_ATTEMPT (1ª tentativa x retry) e disponibilidade
# de runner self-hosted via um binário `gh` stub, sem nenhuma chamada de
# rede real, para confirmar que scripts/ci-select-runner.sh inverteu a
# prioridade: GitHub-hosted primário, self-hosted só como fallback de retry.
#
# Uso: bash scripts/ci-select-runner.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELECT_RUNNER="$SCRIPT_DIR/ci-select-runner.sh"

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

FAIL=0

# Stub do `gh` cli: responde a `gh api repos/.../actions/runners --paginate
# --jq ...` com uma lista fixa de runners (controlada por GH_STUB_ONLINE),
# sem chamada de rede real.
make_gh_stub() {
  local online="$1" # "true" ou "false"
  local stub="$WORKDIR/gh"
  cat > "$stub" <<EOF
#!/usr/bin/env bash
echo "GH_CALLED \$*" >> "$WORKDIR/gh-calls.log"
if [ "$online" = "true" ]; then
  echo 1
else
  echo 0
fi
EOF
  chmod +x "$stub"
  echo "$stub"
}

run_case() {
  local name="$1" run_attempt="$2" actor="$3" gh_online="$4" expect_runner="$5" expect_gh_called="$6"

  local gh_stub
  gh_stub=$(make_gh_stub "$gh_online")
  : > "$WORKDIR/gh-calls.log"

  local output_file="$WORKDIR/output"
  : > "$output_file"

  RUN_ATTEMPT="$run_attempt" ACTOR="$actor" GH_BIN="$gh_stub" REPOSITORY="acme/repo" \
    SELF_HOSTED_LABEL="alfabra-local" POLL_ATTEMPTS=1 POLL_SLEEP_SECONDS=0 \
    OUTPUT_FILE="$output_file" \
    bash "$SELECT_RUNNER" >/dev/null 2>&1 || true

  local got_runner
  got_runner=$(grep '^runner=' "$output_file" | cut -d= -f2- || echo "")

  local gh_called="false"
  [ -s "$WORKDIR/gh-calls.log" ] && gh_called="true"

  if [ "$got_runner" != "$expect_runner" ]; then
    echo "FAIL: $name (runner esperado=$expect_runner, obtido=$got_runner)"
    FAIL=1
  elif [ "$gh_called" != "$expect_gh_called" ]; then
    echo "FAIL: $name (chamada ao gh esperada=$expect_gh_called, obtida=$gh_called)"
    FAIL=1
  else
    echo "OK: $name"
  fi
}

# Caso 1 (núcleo da issue #426): 1ª tentativa é sempre GitHub-hosted,
# mesmo com self-hosted online - não checa disponibilidade nem gasta
# chamada de API (custo zero na run saudável).
run_case "1a tentativa usa ubuntu-latest sem checar self-hosted" \
  1 "someone" "true" '["ubuntu-latest"]' "false"

# Caso 2: retry (RUN_ATTEMPT=2) com self-hosted online - fallback dispara.
run_case "retry com self-hosted online cai para fallback self-hosted" \
  2 "someone" "true" '["self-hosted","alfabra-local"]' "true"

# Caso 3: retry com self-hosted indisponível - permanece em GitHub-hosted
# (nunca aponta para um pool sem runner registrado).
run_case "retry sem self-hosted online permanece em ubuntu-latest" \
  2 "someone" "false" '["ubuntu-latest"]' "true"

# Caso 4: dependabot nunca consulta self-hosted, em nenhuma tentativa (sem
# acesso a secrets de Actions - ver #350).
run_case "dependabot sempre ubuntu-latest, mesmo em retry" \
  2 "dependabot[bot]" "true" '["ubuntu-latest"]' "false"

if [ "$FAIL" -ne 0 ]; then
  echo "--- FALHOU ---"
  exit 1
fi

echo "--- TODOS OS CASOS PASSARAM ---"
