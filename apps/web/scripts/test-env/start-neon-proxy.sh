#!/usr/bin/env bash
# Local tests only. The pinned image's start.sh does not forward proxy options.
set -euo pipefail

children=()
stop() {
  if (( ${#children[@]} )); then
    kill "${children[@]}" 2>/dev/null || true
    wait "${children[@]}" 2>/dev/null || true
  fi
}
trap stop EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

# No request retries: remove the proxy's connection-attempt admission limiter.
# Postgres still enforces max_connections on the shared local test server.
proxy=(./neon-proxy --connect-compute-lock=permits=0)

if [[ "${1:-}" == --check ]]; then
  # Exercise the real binary, not just its help text. An image update must still
  # parse this setting as a zero (disabled) initial limit. No DB traffic is sent.
  directory="$(mktemp -d /tmp/proxy-setting.XXXXXX)"
  fifo="$directory/log"
  mkfifo "$fifo"
  trap 'stop; rm -f -- "$fifo"; rmdir "$directory"' EXIT
  "${proxy[@]}" > "$fifo" 2>&1 &
  children+=("$!")
  while IFS= read -r -t 15 line; do
    case "$line" in
      *'"message":"Using NodeLocks (connect_compute)"'*)
        # Match the whole limiter field. A zero prefix or another field's zero
        # must not turn an unknown/nonzero configuration into a successful check.
        if [[ "$line" == *'"limiter":"RateLimiterConfig { algorithm: Fixed, initial_limit: 0 }"'* ]]; then
          echo 'Neon proxy connection-attempt limiter is disabled.'
          exit 0
        fi
        echo 'Neon proxy did not disable its connection-attempt limiter.' >&2
        exit 1
        ;;
    esac
  done < "$fifo"
  echo 'Cannot verify the Neon proxy connection-attempt setting.' >&2
  exit 1
fi

: "${PG_CONNECTION_STRING:?The local proxy needs PG_CONNECTION_STRING}"
psql -v ON_ERROR_STOP=1 "$PG_CONNECTION_STRING" \
  -c 'CREATE SCHEMA IF NOT EXISTS neon_control_plane' \
  -c 'CREATE TABLE IF NOT EXISTS neon_control_plane.endpoints (endpoint_id VARCHAR(255) PRIMARY KEY, allowed_ips VARCHAR(255))'

"${proxy[@]}" -c server.pem -k server.key \
  --auth-backend=postgres --auth-endpoint="$PG_CONNECTION_STRING" \
  --wss=0.0.0.0:4445 &
children+=("$!")
caddy run --config ./Caddyfile --adapter caddyfile &
children+=("$!")
# Either child exiting must stop the container, not leave half a proxy running.
wait -n "${children[@]}"
