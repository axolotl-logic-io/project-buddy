#!/usr/bin/env bash
# Tests for vercel-promote.sh, run by the site's `npm run check`:
#
#   bash .github/scripts/vercel-promote.test.sh
#
# A stand-in curl, first on PATH, answers with FAKE_STATUS and FAKE_BODY (or
# fails with FAKE_EXIT) and logs its arguments, so no test reaches Vercel.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="$here/vercel-promote.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

mkdir "$work/bin"
cat > "$work/bin/curl" <<'FAKE'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$FAKE_CURL_LOG"
output=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = --output ]; then
    output="$2"
  fi
  shift
done
if [ "${FAKE_EXIT:-0}" -ne 0 ]; then
  echo "curl: (7) Failed to connect" >&2
  printf '000'
  exit "$FAKE_EXIT"
fi
printf '%s' "$FAKE_BODY" > "$output"
printf '%s' "$FAKE_STATUS"
FAKE
chmod +x "$work/bin/curl"

failures=0
fail() {
  echo "FAIL: $1" >&2
  failures=$((failures + 1))
}

# Runs the script with the stand-in curl and the Vercel variables set, then
# with any NAME=value arguments after `--` applied on top (an empty value
# unsets the variable). Sets `code`, `out` and `err`.
promote() {
  local -a args=()
  while [ "$#" -gt 0 ] && [ "$1" != -- ]; do
    args+=("$1")
    shift
  done
  if [ "$#" -gt 0 ]; then
    shift
  fi
  rm -f "$work/curl.log"
  code=0
  env PATH="$work/bin:$PATH" FAKE_CURL_LOG="$work/curl.log" \
    VERCEL_TOKEN=test-token VERCEL_ORG_ID=team_test VERCEL_PROJECT_ID=prj_test \
    "$@" bash "$script" ${args[@]+"${args[@]}"} > "$work/out" 2> "$work/err" || code=$?
  out="$(cat "$work/out")"
  err="$(cat "$work/err")"
}

for status in 200 201 202; do
  promote dpl_new -- FAKE_STATUS="$status" FAKE_BODY='{}'
  [ "$code" -eq 0 ] || fail "HTTP $status should succeed, exited $code: $err"
done

promote dpl_new -- FAKE_STATUS=202 FAKE_BODY='{}'
log="$(cat "$work/curl.log" 2>/dev/null || true)"
grep -qxF 'https://api.vercel.com/v10/projects/prj_test/promote/dpl_new?teamId=team_test' <<<"$log" ||
  fail "the request goes to the project's promote endpoint: $log"
grep -qxF POST <<<"$log" || fail "the request is a POST: $log"
grep -qxF 'Authorization: Bearer test-token' <<<"$log" ||
  fail "the request carries the token: $log"

promote dpl_new -- FAKE_STATUS=404 FAKE_BODY='{"error":{"message":"User not found."}}'
[ "$code" -ne 0 ] || fail "HTTP 404 should fail"
grep -qF 404 <<<"$err" || fail "a 404 prints its status: $err"
grep -qF 'User not found.' <<<"$err" || fail "a 404 prints Vercel's answer: $err"
[ -z "$out" ] || fail "a failure prints nothing to stdout: $out"

promote dpl_new -- FAKE_STATUS=500 FAKE_BODY='oops'
[ "$code" -ne 0 ] || fail "HTTP 500 should fail"

promote dpl_new -- FAKE_EXIT=7
[ "$code" -ne 0 ] || fail "a curl failure should fail"
grep -qF 'curl exit 7' <<<"$err" || fail "a curl failure says so: $err"

promote
[ "$code" -ne 0 ] || fail "a missing deployment id should fail"
grep -qF usage <<<"$err" || fail "a missing deployment id prints the usage: $err"
[ ! -e "$work/curl.log" ] || fail "a missing deployment id calls no API"

for name in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  promote dpl_new -- "$name=" FAKE_STATUS=202 FAKE_BODY='{}'
  [ "$code" -ne 0 ] || fail "a missing $name should fail"
  grep -qF "$name" <<<"$err" || fail "a missing $name is named: $err"
  [ ! -e "$work/curl.log" ] || fail "a missing $name calls no API"
done

for file in "$here"/*.sh; do
  bash -n "$file" || fail "$file does not parse"
done

if [ "$failures" -ne 0 ]; then
  echo "$failures vercel-promote.sh test(s) failed" >&2
  exit 1
fi
echo "vercel-promote.sh: all tests passed"
