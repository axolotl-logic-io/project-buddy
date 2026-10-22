#!/usr/bin/env bash
# Shared local test infrastructure and the complete, canonical lane namespace.
# Source this file; callers validate input before doing any provisioning.
TEST_ENV_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd -- "$TEST_ENV_DIR/../.." && pwd)"
COMPOSE_FILE="$WEB_ROOT/compose.test-db.yml"
SHARED_PROJECT=project-buddy-test-db
SHARED_SERVER="${SHARED_PROJECT}-postgres-1"
SHARED_NETWORK="${SHARED_PROJECT}_default"
PROXY_IMAGE=ghcr.io/timowilhelm/local-neon-http-proxy@sha256:cd2ae14edf2feafbc3330492de5c80506f77274c3bd013154cdef697bdeb768a
PROXY_CONNECTION=postgres://postgres:postgres@postgres:5432/main
MAX_LANE_SLOT=399

# Decimal strings only, bounded before arithmetic (including leading zeroes).
valid_slot() {
  [[ "$1" =~ ^[1-9][0-9]{0,2}$ ]] && (( 10#$1 <= MAX_LANE_SLOT ))
}

lane_names() {
  local slot="$1"
  LANE_PROXY="pb-lane-${slot}-neon-proxy"
  LANE_DATABASE="pb_lane_${slot}"
  LANE_PROXY_PORT=$((24000 + slot))
  LANE_SITE_PORT=$((20000 + 10 * slot))
}

# Return only canonical slots in the owned namespace. Similar names, leading
# zeroes and out-of-range suffixes are not authority to remove a resource.
proxy_slot() {
  local name="$1" slot
  slot="${name#pb-lane-}"
  slot="${slot%-neon-proxy}"
  valid_slot "$slot" || return 1
  lane_names "$slot"
  [[ "$name" == "$LANE_PROXY" ]] || return 1
  printf '%s\n' "$slot"
}

database_slot() {
  local name="$1" slot="${1#pb_lane_}"
  valid_slot "$slot" || return 1
  lane_names "$slot"
  [[ "$name" == "$LANE_DATABASE" ]] || return 1
  printf '%s\n' "$slot"
}

shared_psql() {
  docker exec "$SHARED_SERVER" psql -X --username=postgres --dbname=postgres \
    --set=ON_ERROR_STOP=1 --tuples-only --no-align --command "$1"
}

# A single successful catalog query, parsed before prune authorizes any deletion.
# The essential server databases distinguish an inventory from empty/garbled
# inspection output. Newlines in names are refused rather than misinterpreted.
lane_database_inventory() {
  local inventory
  if ! inventory="$(shared_psql 'SELECT json_agg(datname ORDER BY datname) FROM pg_database')"; then
    echo 'Cannot safely inspect the shared test server: database inventory failed.' >&2
    return 1
  fi
  if ! (cd "$WEB_ROOT" && printf '%s' "$inventory" | node -e '
    const { z } = require("zod");
    const input = require("node:fs").readFileSync(0, "utf8");
    try {
      const names = z.array(z.string().min(1).regex(/^[^\r\n]+$/u)).parse(JSON.parse(input));
      if (new Set(names).size !== names.length ||
          !["main", "postgres", "template0", "template1"].every(name => names.includes(name))) {
        throw new Error("Incomplete inventory");
      }
      for (const name of names) console.log(name);
    } catch {
      console.error("Cannot safely inspect the shared test server: unrecognizable database inventory.");
      process.exitCode = 1;
    }
  '); then
    return 1
  fi
}
