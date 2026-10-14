#!/usr/bin/env bash
# Release a tested integration commit to production.
#
#   scripts/deploy.sh [--dry-run] [--yes] [<commit>]
#
# 1. Checks that <commit> (default: the head of origin/integration) is on
#    integration, that main fast-forwards to it, and that the Integration
#    preview workflow passed for it.
# 2. Fast-forwards main to it. It never force-pushes, so a main with commits
#    that integration lacks stops here.
# 3. Opens a deploy ticket (an issue labelled `deploy`), which starts
#    .github/workflows/release.yml. The ticket closes when the release passes
#    its smoke test.
#
# --dry-run checks and prints what would ship, and changes nothing. --yes
# skips the confirmation. Needs git, gh (logged in with write access) and jq.
set -euo pipefail

usage() {
  echo "Usage: scripts/deploy.sh [--dry-run] [--yes] [<commit on integration>]" >&2
  exit 2
}

dry_run=false
assume_yes=false
target_arg=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    --yes | -y) assume_yes=true ;;
    -h | --help) usage ;;
    -*) echo "Unknown option: $arg" >&2; usage ;;
    *)
      [ -z "$target_arg" ] || usage
      target_arg="$arg"
      ;;
  esac
done

for tool in git gh jq; do
  command -v "$tool" >/dev/null || { echo "$tool is not installed." >&2; exit 1; }
done

cd "$(git rev-parse --show-toplevel)"
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"

git fetch --quiet origin main integration
target="$(git rev-parse --verify "${target_arg:-origin/integration}^{commit}")"
short="${target:0:7}"
main="$(git rev-parse origin/main)"

if ! git merge-base --is-ancestor "$target" origin/integration; then
  echo "$short is not on origin/integration. Deploy only commits that went through integration." >&2
  exit 1
fi
if ! git merge-base --is-ancestor "$main" "$target"; then
  echo "main (${main:0:7}) has commits that $short lacks:" >&2
  git log --oneline "$target..$main" >&2
  echo "Merge main into integration with a PR first, then deploy again." >&2
  exit 1
fi

# The Integration preview run for exactly this commit.
run="$(gh run list -R "$repo" --workflow integration.yml --commit "$target" \
  --limit 1 --json status,conclusion,url --jq '.[0] // empty')"
if [ -z "$run" ]; then
  echo "No Integration preview run for $short yet. Push it to integration, or start one:" >&2
  echo "  gh workflow run integration.yml -R $repo --ref integration" >&2
  exit 1
fi
status="$(jq -r .status <<<"$run")"
conclusion="$(jq -r .conclusion <<<"$run")"
run_url="$(jq -r .url <<<"$run")"
if [ "$status" != completed ]; then
  echo "The Integration preview of $short is still $status: $run_url" >&2
  echo "Run this again when it finishes." >&2
  exit 1
fi
if [ "$conclusion" != success ]; then
  echo "The Integration preview of $short ended in $conclusion: $run_url" >&2
  exit 1
fi

if [ "$main" = "$target" ]; then
  changes="main is already at $short; this redeploys it."
  echo "$changes"
else
  changes="$(git log --reverse --format='- %h %s' "$main..$target")"
  echo "Shipping $(git rev-list --count "$main..$target") commit(s) from ${main:0:7} to $short:"
  echo "$changes"
fi
echo "Integration preview passed: $run_url"

if $dry_run; then
  echo "Dry run: main and the issues are unchanged."
  exit 0
fi
if ! $assume_yes; then
  read -r -p "Fast-forward main to $short and release it to production? [y/N] " answer
  [ "$answer" = y ] || [ "$answer" = Y ] || { echo "Nothing changed."; exit 1; }
fi

if [ "$main" != "$target" ]; then
  # A plain push only fast-forwards; git refuses anything else.
  git push origin "$target:refs/heads/main"
fi

body="$(mktemp)"
trap 'rm -f "$body"' EXIT
{
  echo "Release main at $target to production (opened by scripts/deploy.sh)."
  echo
  echo "Integration preview: $run_url"
  echo
  echo "$changes"
} >"$body"
ticket="$(gh issue create -R "$repo" --title "Deploy $short" --label deploy --body-file "$body")"
echo "Deploy ticket: $ticket"
echo "The release workflow comments there and closes it when production passes its smoke test."
