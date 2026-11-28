#!/usr/bin/env bash
# The test run (scripts/test.sh) against a fake mise: which tasks it runs,
# how it reports them, and the rerun commands it collects. The fake fails the
# tasks named in FAIL_TASKS; a failing test:browser prints a RERUN line, as
# the Vitest failure reporter does.
set -euo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
script="$(cd -- "$here/../../../scripts" && pwd)/test.sh"
work="$(mktemp -d "${TMPDIR:-/tmp}/pb-test-run.XXXXXX")"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/bin"
cat > "$work/bin/mise" <<'FAKE'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$CALLS"
task="${3#//apps/web:}"
echo "output of $task"
for failing in $FAIL_TASKS; do
  if [[ "$task" == "$failing" ]]; then
    if [[ "$task" == test:browser ]]; then
      echo 'RERUN: mise run //apps/web:test:browser --project browser test/a.browser.test.tsx'
    fi
    exit 1
  fi
done
FAKE
chmod +x "$work/bin/mise"
export PATH="$work/bin:$PATH" CALLS="$work/calls"

die() { echo "FAIL: $*" >&2; exit 1; }
contains() { grep -Fq -- "$2" "$1" || die "$1 must contain: $2"; }
not_contains() { if grep -Fq -- "$2" "$1"; then die "$1 must not contain: $2"; fi; }
test_run() {
  : > "$CALLS"
  FAIL_TASKS="$1" bash "$script" > "$work/output" 2>&1
}

# Every stage runs once, as the task of its name, without its dependencies:
# the run installs the browsers itself, once.
test_run '' || die 'A run with no failures must pass'
for task in test:doctor test:scripts test:repository test:server \
  browsers:install test:browser test:system; do
  contains "$CALLS" "run --skip-deps //apps/web:$task"
  contains "$work/output" "PASS $task"
done
[[ "$(wc -l < "$CALLS")" -eq 7 ]] || die 'Each stage must run exactly once'
not_contains "$work/output" 'output of'
not_contains "$work/output" 'Rerun'

# A failed stage prints its output and rerun command; the other stages run
# to completion. A reporter's RERUN line replaces the task's own.
if test_run 'test:server test:browser'; then die 'A failed stage must fail the run'; fi
contains "$work/output" 'FAIL test:server'
contains "$work/output" 'FAIL test:browser'
contains "$work/output" 'PASS test:system'
contains "$work/output" 'PASS test:repository'
contains "$work/output" 'output of test:server'
not_contains "$work/output" 'output of test:system'
contains "$work/output" 'mise run //apps/web:test:server'
contains "$work/output" 'mise run //apps/web:test:browser --project browser test/a.browser.test.tsx'
not_contains "$work/output" 'RERUN:'
[[ "$(grep -c '^mise run //apps/web:test:browser' "$work/output")" -eq 1 ]] ||
  die 'A reporter rerun line must replace the task rerun'

# A failed browser install blocks the browser and system tests.
if test_run 'browsers:install'; then die 'A failed install must fail the run'; fi
contains "$work/output" 'FAIL browsers:install'
contains "$work/output" 'BLOCKED test:browser and test:system'
not_contains "$CALLS" '//apps/web:test:browser'
not_contains "$CALLS" '//apps/web:test:system'
contains "$work/output" 'PASS test:server'

echo 'PASS: the test run'
