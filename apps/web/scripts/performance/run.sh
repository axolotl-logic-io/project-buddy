#!/usr/bin/env bash
# Hold the shared host lock across build, server, browser capture and cleanup.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
exec flock /tmp/project-buddy-unattended-full-suite.lock node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/performance/run.mts "$@"
