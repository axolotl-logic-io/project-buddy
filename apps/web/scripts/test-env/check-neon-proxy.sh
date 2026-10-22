#!/usr/bin/env bash
# Verify the pinned binary's effective setting before provisioning local tests.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/lanes.sh"
# Compose and lane startup must check the same pinned binary.
if ! grep -Fxq -- "    image: $PROXY_IMAGE" "$COMPOSE_FILE"; then
  echo 'Compose and lane Neon proxy images differ; update both pins together.' >&2
  exit 1
fi
docker run --rm --entrypoint /bin/bash "$PROXY_IMAGE" \
  -c "$PROXY_STARTUP" -- --check
