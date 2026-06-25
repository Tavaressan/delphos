#!/usr/bin/env bash
# Abre (ou reanexe) a sessão tmux do Alfabra Vector com instâncias do Claude CLI.
# Uso: ./scripts/tmux-session.sh [--kill]
#
# --kill   derruba a sessão existente antes de recriar

set -euo pipefail

SESSION="alfabra"
ROOT="$HOME/Desktop/Alfabra-Vector"
WORKTREES="$ROOT/.claude/worktrees"

# ── helpers ──────────────────────────────────────────────────────────────────

PANE_COUNT=0

new_claude_pane() {
  local dir="$1"
  local pane_id

  if [[ "$PANE_COUNT" -eq 0 ]]; then
    tmux new-window -t "$SESSION" -n "agents" -c "$dir"
    pane_id=$(tmux display-message -t "$SESSION:agents" -p "#{pane_id}")
  else
    pane_id=$(tmux split-window -t "$SESSION:agents" -h -c "$dir" -P -F "#{pane_id}")
    tmux select-layout -t "$SESSION:agents" even-horizontal
  fi

  tmux send-keys -t "$pane_id" "claude" Enter
  PANE_COUNT=$((PANE_COUNT + 1))
}

# ── flags ────────────────────────────────────────────────────────────────────

if [[ "${1:-}" == "--kill" ]]; then
  tmux kill-session -t "$SESSION" 2>/dev/null || true
fi

# ── reanexe se já existir ────────────────────────────────────────────────────

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Sessão '$SESSION' já existe — reanexando..."
  tmux attach -t "$SESSION"
  exit 0
fi

# ── cria sessão ──────────────────────────────────────────────────────────────

# Janela 0: shell no root (tamanho explícito evita falhas de split fora do terminal)
tmux new-session -d -s "$SESSION" -n "shell" -c "$ROOT" -x 220 -y 50

# Pane 0: claude no root (master / tarefas gerais)
new_claude_pane "$ROOT"

# Panes para worktrees ativos com branch ainda não mergeada no master
if [[ -d "$WORKTREES" ]]; then
  master_head=$(git -C "$ROOT" rev-parse master 2>/dev/null || git -C "$ROOT" rev-parse main 2>/dev/null)
  for wt_path in "$WORKTREES"/*/; do
    [[ -d "$wt_path" ]] || continue
    wt_head=$(git -C "$wt_path" rev-parse HEAD 2>/dev/null) || continue
    git -C "$ROOT" merge-base --is-ancestor "$wt_head" "$master_head" 2>/dev/null && continue
    new_claude_pane "$wt_path"
  done
fi

# Foca no shell ao abrir
tmux select-window -t "$SESSION:shell"

TOTAL_PANES=$(tmux list-panes -t "$SESSION:agents" | wc -l | tr -d ' ')

echo "Sessão '$SESSION' criada: janela 'shell' + $TOTAL_PANES agentes em panes."
echo ""
echo "  Ctrl+B q         — mostra números dos panes (aperte o número pra focar)"
echo "  Ctrl+B z         — zoom no pane ativo (toggle)"
echo "  Ctrl+B ←/→/↑/↓  — navegar entre panes"
echo "  Ctrl+B D         — desanexar"
echo ""

tmux attach -t "$SESSION"