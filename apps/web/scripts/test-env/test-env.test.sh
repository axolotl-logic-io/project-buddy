#!/usr/bin/env bash
# Contract tests in disposable checkouts. Every Docker call hits the strict fake;
# publication is observed at the rename boundary, never by timing readers.
set -euo pipefail
scripts="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd -- "$scripts/../../../.." && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/pb-lanes.XXXXXX")"
trap 'rm -rf -- "$work"' EXIT
export REAL_NODE="$(command -v node)"
export FAKE_DOCKER_STATE="$work/docker"
mkdir -p "$work/bin" "$FAKE_DOCKER_STATE/containers"
ln -s "$scripts/fake-docker.sh" "$work/bin/docker"
export PATH="$work/bin:$PATH"
unset ISSUE_PIPELINE_LANE_SLOT ISSUE_PIPELINE_LANE_SLOTS DATABASE_URL E2E_PORT
unset TUTOR_MODEL EMAIL_TRANSPORT EMAIL_OUTBOX_DIR INVITE_CODE SESSION_SECRET
unset FAKE_INSPECTION FAKE_SETUP_FAILURE FAIL_PUBLICATION FAIL_SERVER

die() { echo "FAIL: $*" >&2; exit 1; }
contains() { grep -Fq -- "$2" "$1" || die "$1 must contain $2"; }
not_contains() { if grep -Fq -- "$2" "$1"; then die "$1 must not contain $2"; fi; }
same() { cmp -s "$1" "$2" || die "Files differ: $1 and $2"; }
empty() { [[ ! -s "$1" ]] || die "Expected no calls/mutations: $1"; }
clear_log() { : > "$FAKE_DOCKER_STATE/calls"; : > "$FAKE_DOCKER_STATE/mutations"; }
fails() {
  if "$@" > "$work/error" 2>&1; then die "Command unexpectedly succeeded: $*"; fi
}
new_checkout() {
  checkout="$work/$1/apps/web"
  mkdir -p "$checkout/scripts/test-env"
  cp "$scripts/"*.sh "$checkout/scripts/test-env/"
  cp "$scripts/../../.env.test.example" "$checkout/.env.test.example"
  cp "$scripts/../../compose.test-db.yml" "$checkout/compose.test-db.yml"
  cp "$scripts/../../package.json" "$checkout/package.json"
  ln -s "$repo/node_modules" "$work/$1/node_modules"
}
setup_lane() { ISSUE_PIPELINE_LANE_SLOT="$1" bash "$checkout/scripts/test-env/setup.sh" > "$work/setup-output"; }
prune() { ISSUE_PIPELINE_LANE_SLOTS="$1" bash "$checkout/scripts/test-env/prune.sh" > "$work/prune-output"; }

printf '%s\n' main postgres template0 template1 > "$FAKE_DOCKER_STATE/databases"
clear_log
new_checkout 'checkout one'
cp "$checkout/.env.test.example" "$work/example-before"

# No-slot mode does nothing with an absent, existing or symlink destination.
for mode in absent existing link; do
  rm -f "$checkout/.env.test"
  case "$mode" in
    existing) echo original > "$checkout/.env.test" ;;
    link) echo target > "$work/link-target"; ln -s "$work/link-target" "$checkout/.env.test" ;;
  esac
  bash "$checkout/scripts/test-env/setup.sh" > /dev/null
  ISSUE_PIPELINE_LANE_SLOT='' bash "$checkout/scripts/test-env/setup.sh" > /dev/null
  case "$mode" in
    absent) [[ ! -e "$checkout/.env.test" ]] || die 'No-slot setup created file' ;;
    existing) [[ "$(cat "$checkout/.env.test")" == original ]] || die 'No-slot setup changed file' ;;
    link) [[ -L "$checkout/.env.test" && "$(cat "$work/link-target")" == target ]] || die 'No-slot setup followed link' ;;
  esac
  empty "$FAKE_DOCKER_STATE/calls"
done

# Invalid slots fail before any provisioning or file publication, existing or not.
for value in 0 -1 400 1.5 lane '+1' ' 1' 99999999999999999999999999; do
  for mode in absent existing; do
    rm -f "$checkout/.env.test"
    if [[ "$mode" == existing ]]; then echo original > "$checkout/.env.test"; fi
    fails env ISSUE_PIPELINE_LANE_SLOT="$value" bash "$checkout/scripts/test-env/setup.sh"
    contains "$work/error" 'whole number from 1 to 399'
    empty "$FAKE_DOCKER_STATE/calls"
    if [[ "$mode" == existing ]]; then
      [[ "$(cat "$checkout/.env.test")" == original ]] || die 'Invalid slot changed file'
    else [[ ! -e "$checkout/.env.test" ]] || die 'Invalid slot created file'; fi
  done
done

# Start missing proxies and create missing databases. All other template settings
# are byte-for-byte preserved; neither another lane nor the example is modified.
for row in '1 24001 20010' '2 24002 20020' '399 24399 23990'; do
  read -r slot proxy_port site_port <<< "$row"
  setup_lane "$slot"
  contains "$checkout/.env.test" "DATABASE_URL=postgres://postgres:postgres@127.0.0.1:$proxy_port/pb_lane_$slot"
  contains "$checkout/.env.test" "E2E_PORT=$site_port"
  contains "$FAKE_DOCKER_STATE/databases" "pb_lane_$slot"
  contains "$FAKE_DOCKER_STATE/containers/pb-lane-$slot-neon-proxy/configuration" "127.0.0.1\",\"HostPort\":\"$proxy_port"
  contains "$FAKE_DOCKER_STATE/containers/pb-lane-$slot-neon-proxy/configuration" 'PG_CONNECTION_STRING=postgres://postgres:postgres@postgres:5432/main'
  contains "$FAKE_DOCKER_STATE/containers/pb-lane-$slot-neon-proxy/configuration" '|project-buddy-test-db_default|'
  sed -e '/^DATABASE_URL=/d' -e '/^E2E_PORT=/d' "$checkout/.env.test.example" > "$work/settings-before"
  sed -e '/^DATABASE_URL=/d' -e '/^E2E_PORT=/d' "$checkout/.env.test" > "$work/settings-after"
  same "$work/settings-before" "$work/settings-after"
  same "$work/example-before" "$checkout/.env.test.example"
done
contains "$FAKE_DOCKER_STATE/calls" 'compose --project-name project-buddy-test-db'
not_contains "$FAKE_DOCKER_STATE/mutations" 'rm '
not_contains "$FAKE_DOCKER_STATE/mutations" 'drop '

# Correct running proxies and existing data are reused. The fake keeps a data
# marker for each database; any reset/drop would remove the database or log it.
echo 'retained lane data' > "$FAKE_DOCKER_STATE/lane-data"
clear_log
setup_lane 1
cp "$checkout/.env.test" "$work/lane-one-env"
not_contains "$FAKE_DOCKER_STATE/mutations" 'run '
not_contains "$FAKE_DOCKER_STATE/mutations" 'create '
not_contains "$FAKE_DOCKER_STATE/mutations" 'drop '
not_contains "$FAKE_DOCKER_STATE/mutations" 'rm '
[[ "$(cat "$FAKE_DOCKER_STATE/lane-data")" == 'retained lane data' ]] || die 'Data changed'
# Leading zeroes are decimal input, not octal or a second resource namespace.
setup_lane 001
same "$work/lane-one-env" "$checkout/.env.test"

# Each mismatch requires replacement of this lane only, without a database reset.
config="$FAKE_DOCKER_STATE/containers/pb-lane-1-neon-proxy/configuration"
cp "$config" "$work/correct-proxy"
for mismatch in stopped image network connection port external extra-binding extra-network; do
  case "$mismatch" in
    stopped) sed 's/|true|/|false|/' "$work/correct-proxy" > "$config" ;;
    image) sed 's/ghcr.io/other.registry/' "$work/correct-proxy" > "$config" ;;
    network) sed 's/project-buddy-test-db_default/other-network/' "$work/correct-proxy" > "$config" ;;
    connection) sed 's/@postgres:5432/@other:5432/' "$work/correct-proxy" > "$config" ;;
    port) sed 's/24001/24099/' "$work/correct-proxy" > "$config" ;;
    external) sed 's/127.0.0.1/0.0.0.0/' "$work/correct-proxy" > "$config" ;;
    extra-binding) sed 's/"HostPort":"24001"}/"HostPort":"24001"},{"HostIp":"0.0.0.0","HostPort":"24002"}/' "$work/correct-proxy" > "$config" ;;
    extra-network) sed 's/|1$/|2/' "$work/correct-proxy" > "$config" ;;
  esac
  clear_log
  setup_lane 1
  same "$work/correct-proxy" "$config"
  contains "$FAKE_DOCKER_STATE/mutations" 'rm pb-lane-1-neon-proxy'
  contains "$FAKE_DOCKER_STATE/mutations" 'run pb-lane-1-neon-proxy'
  not_contains "$FAKE_DOCKER_STATE/mutations" 'pb-lane-2'
  not_contains "$FAKE_DOCKER_STATE/mutations" 'drop '
  not_contains "$FAKE_DOCKER_STATE/mutations" 'create '
done
clear_log
fails env FAKE_INSPECTION=proxy-inspection ISSUE_PIPELINE_LANE_SLOT=1 bash "$checkout/scripts/test-env/setup.sh"
not_contains "$FAKE_DOCKER_STATE/mutations" 'rm '
not_contains "$FAKE_DOCKER_STATE/mutations" 'drop '

# Two checkouts receive distinct reusable configurations, not per-run allocations.
new_checkout 'checkout two'
setup_lane 2
cp "$checkout/.env.test" "$work/lane-two-env"
not_contains "$work/lane-two-env" 'pb_lane_1'
contains "$work/lane-two-env" 'E2E_PORT=20020'

# Observe atomic publication synchronously just before rename. A symlink target
# is never touched, and injected rename failure leaves the complete old file.
export EXPECT_PUBLICATION="$work/lane-two-env"
cat > "$work/bin/node" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *renameSync* ]]; then
  cmp -s "$3" "$EXPECT_PUBLICATION" || exit 91
  [[ -f "$3" && ! -L "$3" ]] || exit 92
  if [[ "${FAIL_PUBLICATION:-}" == 1 ]]; then exit 93; fi
fi
exec "$REAL_NODE" "$@"
SH
chmod +x "$work/bin/node"
echo 'complete old environment' > "$checkout/.env.test"
cp "$checkout/.env.test" "$work/old-env"
# A writer that fails after emitting partial output cannot expose that output.
cat > "$work/bin/sed" <<'SH'
#!/usr/bin/env bash
printf '%s\n' 'partial environment'
echo 'injected environment generation failure' >&2
exit 94
SH
chmod +x "$work/bin/sed"
fails env ISSUE_PIPELINE_LANE_SLOT=2 bash "$checkout/scripts/test-env/setup.sh"
contains "$work/error" 'injected environment generation failure'
same "$work/old-env" "$checkout/.env.test"
if compgen -G "$checkout/.env.test.lane.*" > /dev/null; then die 'Failed write leaked publication file'; fi
rm "$work/bin/sed"
fails env FAIL_PUBLICATION=1 ISSUE_PIPELINE_LANE_SLOT=2 bash "$checkout/scripts/test-env/setup.sh"
same "$work/old-env" "$checkout/.env.test"
if compgen -G "$checkout/.env.test.lane.*" > /dev/null; then die 'Leaked publication file'; fi
setup_lane 2
same "$work/lane-two-env" "$checkout/.env.test"
rm "$checkout/.env.test"
fails env FAIL_PUBLICATION=1 ISSUE_PIPELINE_LANE_SLOT=2 bash "$checkout/scripts/test-env/setup.sh"
[[ ! -e "$checkout/.env.test" ]] || die 'Failed publication left partial file'
if compgen -G "$checkout/.env.test.lane.*" > /dev/null; then die 'Leaked publication file'; fi
echo 'symlink target must not change' > "$work/target"
cp "$work/target" "$work/target-before"
ln -s "$work/target" "$checkout/.env.test"
setup_lane 2
same "$work/target-before" "$work/target"
[[ -f "$checkout/.env.test" && ! -L "$checkout/.env.test" ]] || die 'Publication followed link'
# Even a link to a directory must be replaced, not traversed by mv semantics.
rm "$checkout/.env.test"
mkdir "$work/target-directory"
ln -s "$work/target-directory" "$checkout/.env.test"
setup_lane 2
[[ ! -L "$checkout/.env.test" ]] || die 'Directory link retained'
[[ -z "$(ls -A "$work/target-directory")" ]] || die 'Directory link followed'
same "$work/example-before" "$checkout/.env.test.example"
rm "$work/bin/node"

# Failed infrastructure operations must never publish a new environment or
# follow a destination link. Failures are injected at command boundaries rather
# than by killing a timed process; other lanes and their data remain untouched.
saved_checkout="$checkout"
new_checkout 'failed setup'
for failure in compose proxy-run existence-query existence-result create; do
  case "$failure" in
    compose) expected_error='compose startup failed' ;;
    proxy-run) expected_error='proxy startup failed' ;;
    existence-query) expected_error='existence query failed' ;;
    existence-result) expected_error='Cannot recognize the shared server database existence result' ;;
    create) expected_error='database creation failed' ;;
  esac
  for mode in absent existing link; do
    rm -f "$checkout/.env.test"
    case "$mode" in
      existing) cp "$work/lane-two-env" "$checkout/.env.test" ;;
      link) ln -s "$work/target" "$checkout/.env.test" ;;
    esac
    clear_log
    fails env FAKE_SETUP_FAILURE="$failure" ISSUE_PIPELINE_LANE_SLOT=3 bash "$checkout/scripts/test-env/setup.sh"
    contains "$work/error" "$expected_error"
    case "$mode" in
      absent) [[ ! -e "$checkout/.env.test" ]] || die 'Failed setup published environment' ;;
      existing) same "$work/lane-two-env" "$checkout/.env.test" ;;
      link) [[ -L "$checkout/.env.test" ]] || die 'Failed setup replaced link'; same "$work/target-before" "$work/target" ;;
    esac
    if compgen -G "$checkout/.env.test.lane.*" > /dev/null; then die 'Failed setup leaked publication file'; fi
    not_contains "$FAKE_DOCKER_STATE/mutations" 'rm '
    not_contains "$FAKE_DOCKER_STATE/mutations" 'drop '
    not_contains "$FAKE_DOCKER_STATE/mutations" 'create '
    not_contains "$FAKE_DOCKER_STATE/mutations" 'pb-lane-1-'
    not_contains "$FAKE_DOCKER_STATE/mutations" 'pb-lane-2-'
    same "$work/example-before" "$checkout/.env.test.example"
  done
done
checkout="$saved_checkout"

# Prune preserves exact in-range resources and everything outside its namespace.
for name in pb-lane-3-neon-proxy pb-issue-3-neon-proxy project-buddy-test-db-neon-proxy-1 other \
  pb-lane-03-neon-proxy pb-lane-400-neon-proxy pb-lane-3-neon-proxy-extra; do
  mkdir -p "$FAKE_DOCKER_STATE/containers/$name"
done
printf '%s\n' pb_lane_3 pb_issue_3 project_buddy_e2e unrelated pb_lane_03 pb_lane_400 pb_lane_3_extra >> "$FAKE_DOCKER_STATE/databases"
clear_log
prune 2
printf '%s\n' 'rm pb-lane-3-neon-proxy' 'rm pb-lane-399-neon-proxy' 'drop pb_lane_3' 'drop pb_lane_399' | sort > "$work/expected-removals"
sort "$FAKE_DOCKER_STATE/mutations" > "$work/removals"
same "$work/expected-removals" "$work/removals"
for name in pb_lane_1 pb_lane_2 pb_issue_3 project_buddy_e2e unrelated pb_lane_03 pb_lane_400 pb_lane_3_extra; do
  contains "$FAKE_DOCKER_STATE/databases" "$name"
done
[[ -d "$FAKE_DOCKER_STATE/containers/pb-lane-1-neon-proxy" ]] || die 'Lost in-range proxy'
clear_log
prune 2
empty "$FAKE_DOCKER_STATE/mutations"

# Invalid counts fail before even inspecting Docker. Zero is explicit, not a
# fallback. Arbitrarily large nonnegative counts are safe and retain all lanes.
for value in '' -1 1.5 lane '+2' ' 2'; do
  clear_log
  fails env ISSUE_PIPELINE_LANE_SLOTS="$value" bash "$checkout/scripts/test-env/prune.sh"
  contains "$work/error" 'nonnegative whole number'
  empty "$FAKE_DOCKER_STATE/calls"
done
fails bash "$checkout/scripts/test-env/prune.sh"
contains "$work/error" 'nonnegative whole number'
prune 999999999999999999999999999
empty "$FAKE_DOCKER_STATE/mutations"

mkdir -p "$FAKE_DOCKER_STATE/containers/pb-lane-3-neon-proxy"
echo pb_lane_3 >> "$FAKE_DOCKER_STATE/databases"
for uncertainty in unavailable not-running garbled inventory-failure bad-json empty wrong-type missing-core duplicate line-break empty-name list-failure; do
  clear_log
  fails env FAKE_INSPECTION="$uncertainty" ISSUE_PIPELINE_LANE_SLOTS=2 bash "$checkout/scripts/test-env/prune.sh"
  empty "$FAKE_DOCKER_STATE/mutations"
  [[ -d "$FAKE_DOCKER_STATE/containers/pb-lane-3-neon-proxy" ]] || die 'Uncertain inspection removed proxy'
  contains "$FAKE_DOCKER_STATE/databases" pb_lane_3
done
prune 0
for name in pb_lane_1 pb_lane_2 pb_lane_3; do
  if grep -Fxq "$name" "$FAKE_DOCKER_STATE/databases"; then die "Prune retained obsolete $name"; fi
done
[[ -d "$FAKE_DOCKER_STATE/containers/project-buddy-test-db-postgres-1" ]] || die 'Removed shared server'

# Every public environment-dependent command fails before Docker/DB/test work.
rm "$checkout/.env.test"
clear_log
for command in test:server test:playwright test:e2e test:visual test:visual:update test-db:up test-db:down test-db:reset test-db:reindex; do
  fails bash -c 'cd "$1" && npm run "$2"' -- "$checkout" "$command"
  contains "$work/error" 'Missing apps/web/.env.test'
  contains "$work/error" 'orchestrator provides'
  contains "$work/error" 'by hand'
  [[ ! -e "$checkout/.env.test" ]] || die 'Command created environment file'
  empty "$FAKE_DOCKER_STATE/calls"
done

# Exercise the real npm routing and Node --env-file contract, replacing only the
# DB/test entrypoints in a fresh fixture. No real tests, containers or DB run.
rm "$work/checkout two/node_modules"
mkdir -p "$work/checkout two/node_modules/vitest" "$work/checkout two/node_modules/@playwright/test" "$checkout/scripts/test-db"
cat > "$work/record.mjs" <<'JS'
import fs from 'node:fs';
const entry = process.argv[1].split('/').at(-1);
fs.appendFileSync(process.env.COMMAND_LOG, JSON.stringify({entry, args: process.argv.slice(2), database: process.env.DATABASE_URL, port: process.env.E2E_PORT}) + '\n');
if (entry === 'vitest.mjs' && process.env.FAIL_SERVER === '1') process.exitCode = 17;
JS
cp "$work/record.mjs" "$work/checkout two/node_modules/vitest/vitest.mjs"
cp "$work/record.mjs" "$work/checkout two/node_modules/@playwright/test/cli.js"
cp "$work/record.mjs" "$checkout/scripts/test-db/reset.ts"
cp "$work/lane-two-env" "$checkout/.env.test"
export COMMAND_LOG="$work/command-log"
: > "$COMMAND_LOG"
(cd "$checkout" && npm run test:playwright -- e2e/sign-in.spec.ts) > "$work/npm-output" 2>&1
contains "$COMMAND_LOG" '"args":["test","e2e/sign-in.spec.ts"]'
not_contains "$COMMAND_LOG" vitest
not_contains "$COMMAND_LOG" reset
: > "$COMMAND_LOG"
(cd "$checkout" && npm run test:e2e) > "$work/npm-output" 2>&1
[[ "$(wc -l < "$COMMAND_LOG" | tr -d ' ')" == 3 ]] || die 'Wrong e2e stage count'
sed -n '1p' "$COMMAND_LOG" > "$work/line"; contains "$work/line" '"entry":"reset.ts"'
sed -n '2p' "$COMMAND_LOG" > "$work/line"; contains "$work/line" '"entry":"vitest.mjs"'
sed -n '3p' "$COMMAND_LOG" > "$work/line"; contains "$work/line" '"entry":"cli.js"'
[[ "$(grep -Fc '"database":"postgres://postgres:postgres@127.0.0.1:24002/pb_lane_2","port":"20020"' "$COMMAND_LOG")" == 3 ]] || die 'Stages did not share supplied environment'
: > "$COMMAND_LOG"
fails bash -c 'cd "$1" && FAIL_SERVER=1 npm run test:e2e' -- "$checkout"
not_contains "$COMMAND_LOG" '"entry":"cli.js"'
same "$work/lane-two-env" "$checkout/.env.test"
: > "$COMMAND_LOG"
(cd "$checkout" && npm run test:visual:update) > "$work/npm-output" 2>&1
contains "$COMMAND_LOG" '"args":["test","--project=visual*","--update-snapshots"]'
[[ "$(wc -l < "$COMMAND_LOG" | tr -d ' ')" == 3 ]] || die 'Visual update skipped server tests'
same "$work/lane-two-env" "$checkout/.env.test"

# A developer's manually copied file is equally valid, with no lane variable.
cp "$checkout/.env.test.example" "$checkout/.env.test"
cp "$checkout/.env.test" "$work/manual-before"
: > "$COMMAND_LOG"
(cd "$checkout" && npm run test:playwright -- e2e/sign-in.spec.ts) > "$work/npm-output" 2>&1
contains "$COMMAND_LOG" '"database":"postgres://postgres:postgres@localhost:4444/project_buddy_e2e","port":"3100"'
not_contains "$COMMAND_LOG" vitest
same "$work/manual-before" "$checkout/.env.test"
empty "$FAKE_DOCKER_STATE/calls"
echo 'PASS: lane test environment scripts and command routing'
