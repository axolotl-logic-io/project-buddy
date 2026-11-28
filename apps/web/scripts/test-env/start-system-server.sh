#!/usr/bin/env bash
# Playwright's web server (playwright.config.ts): empties and migrates the
# system test database, builds the site and serves it on port $1 with the
# environment Playwright gives it. Each setup failure names its rerun
# command before Playwright has test cases to report.
set -uo pipefail
system='mise run //apps/web:test:system'

run() {
  local rerun="$1" status
  shift
  "$@" && return 0
  status=$?
  printf 'RERUN: %s\n' "$rerun" >&2
  exit "$status"
}

run "$system" node scripts/db/reset.ts system

# Only an audit build of the clean, current checkout can be reused. A
# normal system run rebuilds and invalidates the audit's record.
stamp=.next/audit-commit
if [[ "${2:-}" == --audit ]]; then
  commit="$(git rev-parse HEAD)" || exit 1
  clean="$(git status --porcelain)" || exit 1
fi
if [[ "${2:-}" == --audit && -z "$clean" && -s .next/BUILD_ID &&
      -f "$stamp" && "$(cat "$stamp")" == "$commit" ]]; then
  printf 'Using the audit build of %s\n' "$commit"
else
  rm -f -- "$stamp" || exit 1
  run "$system" next build
  if [[ "${2:-}" == --audit && -z "$clean" &&
        "$(git rev-parse HEAD)" == "$commit" && -z "$(git status --porcelain)" ]]; then
    printf '%s\n' "$commit" > "$stamp" || exit 1
  fi
fi
run "$system" node scripts/check-build-font-urls.ts
exec next start --port "$1"
