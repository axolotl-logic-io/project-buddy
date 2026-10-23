#!/usr/bin/env bash
# Read-only preflight. Unit/browser and fake-Docker script tests do not need it.
set -euo pipefail
web_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ ! -f "$web_root/.env.test" ]]; then
  echo 'Missing apps/web/.env.test. The orchestrator provides this file with a lane-pinned database and E2E_PORT; for a manual run, run `npm run test-env:init` in apps/web to give this worktree its own database and port, or copy apps/web/.env.test.example to apps/web/.env.test by hand and configure them.' >&2
  exit 1
fi
