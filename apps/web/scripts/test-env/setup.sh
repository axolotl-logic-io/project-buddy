#!/usr/bin/env bash
# Provision reusable lane resources, then atomically publish this checkout's file.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/lanes.sh"

slot="${ISSUE_PIPELINE_LANE_SLOT:-}"
if [[ -z "$slot" ]]; then
  echo 'No lane slot supplied; leaving containers, databases and .env.test unchanged.'
  exit 0
fi
# Normalize decimal leading zeroes, without interpreting input as shell arithmetic.
if [[ "$slot" =~ ^[0-9]+$ ]]; then
  slot="${slot#"${slot%%[!0]*}"}"
fi
if ! valid_slot "$slot"; then
  echo 'ISSUE_PIPELINE_LANE_SLOT must be a whole number from 1 to 399.' >&2
  exit 1
fi
lane_names "$slot"

docker compose --project-name "$SHARED_PROJECT" --file "$COMPOSE_FILE" up --detach --wait

exists="$(shared_psql "SELECT 1 FROM pg_database WHERE datname = '$LANE_DATABASE'")"
case "$exists" in
  1) ;; # Setup never resets existing lane data.
  '') shared_psql "CREATE DATABASE $LANE_DATABASE" ;;
  *) echo 'Cannot recognize the shared server database existence result.' >&2; exit 1 ;;
esac

# mktemp creates a private regular file in the destination directory. rename,
# unlike copying or a shell redirection, replaces a symlink instead of following
# it, and exposes only a complete file. A failed write/rename preserves the old
# destination; the trap removes only our own temporary file.
temporary="$(mktemp "$WEB_ROOT/.env.test.lane.XXXXXX")"
trap 'rm -f -- "$temporary"' EXIT
sed -e "s|^DATABASE_URL=.*|DATABASE_URL=postgres://postgres:postgres@127.0.0.1:$SHARED_DATABASE_PORT/$LANE_DATABASE|" \
    -e "s|^E2E_PORT=.*|E2E_PORT=$LANE_SITE_PORT|" \
    "$WEB_ROOT/.env.test.example" > "$temporary"
node -e 'require("node:fs").renameSync(process.argv[1], process.argv[2])' \
  "$temporary" "$WEB_ROOT/.env.test"
echo "Prepared test environment for lane $slot."
