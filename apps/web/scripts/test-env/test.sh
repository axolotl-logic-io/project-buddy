#!/usr/bin/env bash
# Run the independent checks to completion and keep each stage's output together.
set -uo pipefail

logs="$(mktemp -d)" || exit 1
trap 'rm -rf -- "$logs"' EXIT
started_all="$SECONDS"
# Report status immediately and replay failed stage logs after the lanes finish.
stage() {
  local key="$1" label="$2" fallback="$3" started="$SECONDS" status
  shift 3
  "$@" > "$logs/$key.log" 2>&1
  status=$?
  if (( status == 0 )); then
    printf 'PASS %s (%ss)\n' "$label" "$((SECONDS - started))"
    return 0
  fi
  printf 'FAIL %s (%ss)\n' "$label" "$((SECONDS - started))"
  {
    printf '\n%s\n' "$label"
    sed -e '/^RERUN: /d' -e '/\[WebServer\] RERUN: /d' "$logs/$key.log"
  } > "$logs/$key.failure"
  if ! sed -n -e 's/^RERUN: //p' -e 's/^.*\[WebServer\] RERUN: //p' "$logs/$key.log" | sort -u > "$logs/$key.rerun" ||
    [[ ! -s "$logs/$key.rerun" ]]; then
    printf '%s\n' "$fallback" > "$logs/$key.rerun"
  fi
  return "$status"
}

blocked() {
  printf 'BLOCKED %s (%s)\n' "$1" "$2"
}

workspace='npm run --workspace @project-buddy/web'
vitest=(node ../../node_modules/vitest/vitest.mjs run --reporter=default --reporter=./scripts/test-env/vitest-failures.ts)
test_node=(node --env-file=.env.test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON)

fast() {
  local result=0
  stage doctor 'React Doctor' "$workspace test:doctor" npm run --silent test:doctor || result=1
  stage promote 'Release script tests' 'bash .github/scripts/vercel-promote.test.sh' \
    bash ../../.github/scripts/vercel-promote.test.sh || result=1
  stage environment 'Test environment script tests' \
    'bash apps/web/test/component-integration/scripts/test-env/test-env.test.sh' \
    bash test/component-integration/scripts/test-env/test-env.test.sh || result=1
  stage ops 'Operations script tests' 'bash apps/web/test/component-integration/scripts/ops/ops.test.sh' \
    bash test/component-integration/scripts/ops/ops.test.sh || result=1
  stage repository 'Repository tests' "$workspace test:repository" \
    "${vitest[@]}" --project repository --project vite-integration || result=1
  return "$result"
}

database() {
  local result=0
  if [[ ! -f .env.test ]]; then
    stage environment_setup 'Test environment setup' "$workspace test-env:init" \
      bash scripts/test-env/require-env-test.sh
    blocked 'Server tests' '.env.test is missing'
    if [[ "$mode" == all ]]; then blocked 'Playwright system tests' '.env.test is missing'; fi
    return 1
  fi
  if stage server_reset 'Server test database reset' "$workspace test-db:reset" npm run --silent test-db:reset; then
    stage server 'Server tests' "$workspace test:server" "${test_node[@]}" \
      "${vitest[@]:1}" --config vitest.server.config.mts || result=1
  else
    blocked 'Server tests' 'database reset failed'
    result=1
  fi
  if [[ "$mode" == all ]]; then
    if (( installed != 0 )); then
      blocked 'Playwright system tests' 'browser installation failed'
      return 1
    fi
    if stage system_reset 'Playwright test database reset' "$workspace test-db:reset" npm run --silent test-db:reset; then
      stage system 'Playwright system tests' "$workspace test:system" "${test_node[@]}" \
        ../../node_modules/@playwright/test/cli.js test || result=1
    else
      blocked 'Playwright system tests' 'database reset failed'
      result=1
    fi
  fi
  return "$result"
}

mode="${1:-all}"
result=0
fast &
fast_pid=$!
if [[ "$mode" == all ]]; then
  # Start installation once. Wait for it in the parent before starting either browser runner.
  stage install 'Browser installation' "$workspace browsers:install" npm run --silent browsers:install &
  install_pid=$!
  if wait "$install_pid"; then
    installed=0
    stage browser 'Vitest browser tests' "$workspace test:browser" "${vitest[@]}" --project 'browser*' &
    browser_pid=$!
  else
    installed=1
    blocked 'Vitest browser tests' 'browser installation failed'
    result=1
  fi
fi
database &
database_pid=$!

wait "$fast_pid" || result=1
wait "$database_pid" || result=1
if [[ -n "${browser_pid:-}" ]]; then wait "$browser_pid" || result=1; fi

shopt -s nullglob
failures=("$logs/"*.failure)
if (( ${#failures[@]} > 0 )); then cat "${failures[@]}"; fi
reruns=("$logs/"*.rerun)
if (( ${#reruns[@]} > 0 )); then
  printf '\nRerun from the repository root\n'
  sort -u "${reruns[@]}"
fi
printf 'Test run finished in %ss\n' "$((SECONDS - started_all))"
exit "$result"
