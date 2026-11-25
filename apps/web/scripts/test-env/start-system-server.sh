#!/usr/bin/env bash
# Identify setup failures before Playwright has test cases to report.
set -uo pipefail

run() {
  local rerun="$1" status
  shift
  "$@" && return 0
  status=$?
  printf 'RERUN: %s\n' "$rerun" >&2
  exit "$status"
}

run 'npm run --workspace @project-buddy/web test:build' npm run build
run 'npm exec --workspace @project-buddy/web -- node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-build-font-urls.ts' \
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-build-font-urls.ts
exec npm run start -- --port "$1"
