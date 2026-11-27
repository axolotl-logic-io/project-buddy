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
  run 'npm run --workspace @project-buddy/web test:build' npm run build
  if [[ "${2:-}" == --audit && -z "$clean" &&
        "$(git rev-parse HEAD)" == "$commit" && -z "$(git status --porcelain)" ]]; then
    printf '%s\n' "$commit" > "$stamp" || exit 1
  fi
fi
run 'npm exec --workspace @project-buddy/web -- node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-build-font-urls.ts' \
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-build-font-urls.ts
exec npm run start -- --port "$1"
