#!/usr/bin/env bash
# `mise run //apps/web:test`: every test of the site. Each stage is one of the
# site's test tasks, so its rerun command is its own task. The stages run in
# three parallel lanes: the fast checks, the server tests, and the browser
# install followed by the browser and system tests in order. Every stage
# runs to completion; each one's output is kept together, and the failed
# stages' output and rerun commands are printed after the lanes finish.
set -uo pipefail

logs="$(mktemp -d)" || exit 1
trap 'rm -rf -- "$logs"' EXIT
started_all="$SECONDS"

# Runs a task, reporting its status at once. A failed stage keeps its output
# and the rerun commands its reporter printed, or else the task itself.
stage() {
  local task="$1" started="$SECONDS" status
  shift
  local key="${task//:/-}"
  mise run --skip-deps "//apps/web:$task" "$@" > "$logs/$key.log" 2>&1
  status=$?
  if (( status == 0 )); then
    printf 'PASS %s (%ss)\n' "$task" "$((SECONDS - started))"
    return 0
  fi
  printf 'FAIL %s (%ss)\n' "$task" "$((SECONDS - started))"
  {
    printf '\n%s\n' "$task"
    sed -e '/^RERUN: /d' -e '/\[WebServer\] RERUN: /d' "$logs/$key.log"
  } > "$logs/$key.failure"
  sed -n -e 's/^RERUN: //p' -e 's/^.*\[WebServer\] RERUN: //p' "$logs/$key.log" |
    sort -u > "$logs/$key.rerun"
  if [[ ! -s "$logs/$key.rerun" ]]; then
    printf 'mise run //apps/web:%s\n' "$task" > "$logs/$key.rerun"
  fi
  return "$status"
}

fast() {
  local result=0
  stage test:doctor || result=1
  stage test:scripts || result=1
  stage test:repository || result=1
  return "$result"
}

browsers() {
  local result=0
  if ! stage browsers:install; then
    printf 'BLOCKED test:browser and test:system (browser installation failed)\n'
    return 1
  fi
  # The Playwright build and browsers compete with Vitest's browsers for
  # rendering time. Give each browser suite its own turn on the same runner.
  stage test:browser || result=1
  stage test:system || result=1
  return "$result"
}

result=0
fast &
fast_pid=$!
stage test:server &
server_pid=$!
browsers &
browsers_pid=$!
wait "$fast_pid" || result=1
wait "$server_pid" || result=1
wait "$browsers_pid" || result=1

shopt -s nullglob
failures=("$logs/"*.failure)
if (( ${#failures[@]} > 0 )); then cat "${failures[@]}"; fi
reruns=("$logs/"*.rerun)
if (( ${#reruns[@]} > 0 )); then
  printf '\nRerun\n'
  sort -u "${reruns[@]}"
fi
printf 'Test run finished in %ss\n' "$((SECONDS - started_all))"
exit "$result"
