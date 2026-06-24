#!/usr/bin/env bash
# Applies branch protection rules to master via GitHub CLI.
# Requirements: gh >= 2.x, authenticated with repo scope.
# Usage: ./scripts/setup-branch-protection.sh [owner/repo]

set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)}"

if [[ -z "$REPO" ]]; then
  echo "ERROR: could not detect repo. Run inside the git directory or pass owner/repo as argument." >&2
  exit 1
fi

BRANCH="master"

echo "==> Applying branch protection to '${BRANCH}' on ${REPO}..."

# ── 1-4. Branch protection rules ──────────────────────────────────────────────
gh api \
  --method PUT \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --header "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Rust Check, Lint, Format & Test",
      "Java Core Build & Test",
      "Frontend Lint, Test & Build",
      "Python Lint & Test"
    ]
  },
  "enforce_admins": true,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true
}
JSON

echo "    [OK] Pull request obrigatório (min. 1 aprovação, stale reviews descartadas)"
echo "    [OK] Status checks obrigatórios (4 jobs CI)"
echo "    [OK] enforce_admins: true — regras valem para todos, sem exceção"
echo "    [OK] Force push e deleção da branch bloqueados"

# ── 5. Auto-delete de head branches após merge ────────────────────────────────
echo "==> Ativando auto-delete de head branches em ${REPO}..."

gh api \
  --method PATCH \
  "repos/${REPO}" \
  --header "Accept: application/vnd.github+json" \
  -f delete_branch_on_merge=true \
  > /dev/null

echo "    [OK] Branches deletadas automaticamente após merge"

echo ""
echo "Branch protection aplicada com sucesso em ${REPO}:${BRANCH}."
echo "Confirme em: https://github.com/${REPO}/settings/branches"
