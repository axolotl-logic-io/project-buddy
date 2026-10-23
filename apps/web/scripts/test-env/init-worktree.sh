#!/usr/bin/env bash
# `npm run test-env:init`: gives this worktree its own test environment, one
# database per worktree. Writes apps/web/.env.test from .env.test.example with
# a database and site port derived from the worktree's path, so two worktrees
# never share them; every other setting keeps the example's value. An existing
# .env.test, the orchestrator's or a hand-made one, is kept as it is. Touches
# no containers or databases: `npm run test-db:up` starts the shared server and
# `npm run test:server` creates and migrates the database.
set -euo pipefail
web_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
target="$web_root/.env.test"
example="$web_root/.env.test.example"

if [[ -e "$target" || -L "$target" ]]; then
  echo "Kept the existing apps/web/.env.test."
  exit 0
fi

# cksum is POSIX, so macOS and Linux derive the same names from a path.
key="$(printf '%s' "$web_root" | cksum | cut -d ' ' -f 1)"
database="pb_wt_${key}"
# 30000-39999: clear of the example's 3100 and the lanes' 20000-23990.
port=$((30000 + key % 10000))

staged="$(mktemp "$web_root/.env.test.XXXXXX")"
trap 'rm -f -- "$staged"' EXIT
sed -e "s#^DATABASE_URL=\(.*\)/[^/]*\$#DATABASE_URL=\1/${database}#" \
  -e "s#^E2E_PORT=.*#E2E_PORT=${port}#" "$example" > "$staged"
grep -qx "DATABASE_URL=.*/${database}" "$staged" ||
  { echo 'The example has no DATABASE_URL line to set.' >&2; exit 1; }
grep -qx "E2E_PORT=${port}" "$staged" ||
  { echo 'The example has no E2E_PORT line to set.' >&2; exit 1; }
mv -- "$staged" "$target"
trap - EXIT
echo "Wrote apps/web/.env.test: database ${database}, site port ${port}."
