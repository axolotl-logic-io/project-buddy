#!/usr/bin/env bash
# Explicit operator maintenance, never part of a test command's cleanup.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/lanes.sh"

count="${ISSUE_PIPELINE_LANE_SLOTS:-}"
if [[ ! "$count" =~ ^[0-9]+$ ]]; then
  echo 'ISSUE_PIPELINE_LANE_SLOTS must be a nonnegative whole number; refusing to remove resources.' >&2
  exit 1
fi
count="${count#"${count%%[!0]*}"}"
count="${count:-0}"
# All owned slots are <=399. Large valid counts retain everything, without
# risking shell integer overflow or treating malformed input as zero.
if (( ${#count} > 3 )); then count="$MAX_LANE_SLOT"; fi

if ! running="$(docker inspect --format '{{.State.Running}}' "$SHARED_SERVER")" || [[ "$running" != true ]]; then
  echo 'Cannot safely inspect the shared test server: it is unavailable or inspection is unrecognizable.' >&2
  exit 1
fi
# Complete all inspections before the first removal, including proxy removal.
databases="$(lane_database_inventory)"
containers="$(docker container ls --all --format '{{.Names}}')"

while IFS= read -r name; do
  if slot="$(proxy_slot "$name")" && (( slot > count )); then
    docker rm --force "$name"
  fi
done <<< "$containers"
while IFS= read -r name; do
  if slot="$(database_slot "$name")" && (( slot > count )); then
    shared_psql "DROP DATABASE IF EXISTS $name WITH (FORCE)"
  fi
done <<< "$databases"
