#!/usr/bin/env bash
# ci-select-runner.sh — decide o pool de runner (GitHub-hosted x self-hosted)
# para os jobs do ci.yml.
#
# Issue #426: inverte a prioridade herdada da #345/#374 (self-hosted
# primeiro, ubuntu-latest só como fail-safe). GitHub-hosted (ubuntu-latest)
# passa a ser o runner PRIMÁRIO de toda tentativa inicial de um run; o pool
# self-hosted (alfabra-local) só entra como FALLBACK quando o run já está
# sendo reexecutado (RUN_ATTEMPT > 1) — sinal nativo do Actions de que a
# tentativa anterior não terminou com sucesso, seja por falha real de
# teste/build (nesse caso o self-hosted também falharia de novo, sem custo
# extra além do próprio retry) seja por problema de infraestrutura do
# GitHub-hosted (runner nunca atribuído, job cancelado sem rodar nenhum
# step — ver issue #426, âncora empírica de 2026-08-21 nos PRs #397/#399/
# #401).
#
# Extraído do step "Check self-hosted runner availability" do job
# select-runner em ci.yml para ser testável isoladamente — ver
# ci-select-runner.test.sh. O wake-up da instância EC2 (start-instances)
# continua em ci.yml (efeito colateral real, não replicável em teste);
# este script só decide QUAL pool usar, dado que a checagem de
# disponibilidade (quando relevante) já foi feita.
#
# Variáveis injetáveis (default = comportamento real; override só em teste):
#   RUN_ATTEMPT        - número da tentativa do run (default: $GITHUB_RUN_ATTEMPT,
#                         ou 1 se ausente). >1 é o sinal de retry.
#   ACTOR              - github.actor (default: $GITHUB_ACTOR)
#   GH_BIN             - binário gh a invocar para checar runners online
#                         (default: gh)
#   REPOSITORY         - "owner/repo" para a checagem de runners (default:
#                         $GITHUB_REPOSITORY)
#   SELF_HOSTED_LABEL  - label do pool self-hosted (default: alfabra-local)
#   POLL_ATTEMPTS      - nº de tentativas do poll de disponibilidade
#                         (default: 24)
#   POLL_SLEEP_SECONDS - segundos entre tentativas do poll (default: 10)
#   OUTPUT_FILE        - onde escrever `runner=[...]` no formato
#                         $GITHUB_OUTPUT (default: $GITHUB_OUTPUT, ou stdout
#                         se ausente)

set -euo pipefail

RUN_ATTEMPT="${RUN_ATTEMPT:-${GITHUB_RUN_ATTEMPT:-1}}"
ACTOR="${ACTOR:-${GITHUB_ACTOR:-}}"
GH_BIN="${GH_BIN:-gh}"
REPOSITORY="${REPOSITORY:-${GITHUB_REPOSITORY:-}}"
SELF_HOSTED_LABEL="${SELF_HOSTED_LABEL:-alfabra-local}"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-24}"
POLL_SLEEP_SECONDS="${POLL_SLEEP_SECONDS:-10}"
OUTPUT_FILE="${OUTPUT_FILE:-${GITHUB_OUTPUT:-/dev/stdout}}"

emit() {
  echo "runner=$1" >> "$OUTPUT_FILE"
}

# Dependabot roda em contexto restrito, sem acesso aos secrets de Actions do
# repositório (ver #350) — sem GH_TOKEN válido para checar runners self-hosted
# nem credencial AWS para acordar a EC2. Sempre GitHub-hosted.
if [ "$ACTOR" = "dependabot[bot]" ]; then
  echo "::notice::Actor é dependabot[bot] (sem acesso a secrets de Actions, ver #350) - GitHub-hosted"
  emit '["ubuntu-latest"]'
  exit 0
fi

# Primeira tentativa: GitHub-hosted é sempre o pool primário (issue #426) -
# nem sequer consulta o self-hosted, então uma run saudável nunca acorda a
# EC2 nem gasta chamadas de API checando runners.
if [ "$RUN_ATTEMPT" -le 1 ]; then
  echo "::notice::Tentativa 1 - GitHub-hosted (ubuntu-latest) como pool primário"
  emit '["ubuntu-latest"]'
  exit 0
fi

# RUN_ATTEMPT > 1: esta run já foi reexecutada, ou seja, a tentativa
# anterior não terminou com sucesso (falha real OU problema de
# infraestrutura do GitHub-hosted). Self-hosted entra como fallback,
# condicionado a estar de fato online — nunca aponta cegamente para um
# pool sem runner registrado, senão o job fica preso na fila para sempre.
echo "::notice::Tentativa $RUN_ATTEMPT (retry) - checando disponibilidade do pool self-hosted ($SELF_HOSTED_LABEL) como fallback"

ONLINE=0
i=1
while [ "$i" -le "$POLL_ATTEMPTS" ]; do
  ONLINE=$("$GH_BIN" api "repos/${REPOSITORY}/actions/runners" --paginate \
    --jq "[.runners[] | select(.status == \"online\" and (.labels[].name == \"${SELF_HOSTED_LABEL}\"))] | length" \
    2>/dev/null || echo 0)
  if [ "$ONLINE" -gt 0 ] 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  [ "$i" -le "$POLL_ATTEMPTS" ] && sleep "$POLL_SLEEP_SECONDS"
done

if [ "${ONLINE:-0}" -gt 0 ] 2>/dev/null; then
  echo "::notice::$ONLINE runner(s) self-hosted online ($SELF_HOSTED_LABEL) - usando self-hosted como fallback"
  emit "[\"self-hosted\",\"${SELF_HOSTED_LABEL}\"]"
else
  echo "::notice::Nenhum runner self-hosted online após poll - permanece em GitHub-hosted (ubuntu-latest)"
  emit '["ubuntu-latest"]'
fi
