#!/bin/bash
# Proposal only: locked dependencies THEN conditional offline local Next metadata.
# Fast-only; no trust, database, environment publication, test or acceptance.
# The configured command must start this shell under env -i (see contract).
set -euo pipefail
stage="${PB_TEST_STAGE:-fast}"
case "$stage" in
  fast) ;;
  *) printf '%s\n' 'PB setup supports only the fast preparation profile' >&2; exit 2 ;;
esac
proposal=/Users/axolotl-logic/workspace/agent-handoffs/project-buddy/20261019-launch-ready/dispatch-20261022-four-lane-drain/approved-pb-policy-v4
node=/Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/bin/node
npm=/Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/lib/node_modules/npm/bin/npm-cli.js
safe_path=/Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/bin:/usr/bin:/bin:/usr/sbin:/sbin
# Verify exact regular companions before Python executes any proposal code.
proof() {
  /usr/bin/env -i PATH="$safe_path" HOME=/nonexistent /usr/bin/python3 -I -S - "$proposal" "$1" "$stage" <<'PYBOOT'
import hashlib
import os
from pathlib import Path
import stat
import sys
expected = {'verify-check-profile.v4.py': 'd9d28d8a3eb980aebca54d530f1c2a8eb6335f2ae8051c4d19d10083b1325f40', 'prepare-next-metadata.v4.py': '7bc718f4299fa8c26f507dc9618fbdafaad5926f22a0def6d42fd71e777a0a5c', 'check-profile.v4.json': 'b58406892f276ec38e28b6f6214d6313ddefc0f16b77bea8e787f78fd47b8b60'}
here = Path(sys.argv[1])
try:
    for name, digest in expected.items():
        path = here / name
        for parent in path.parents:
            if not stat.S_ISDIR(parent.lstat().st_mode):
                raise ValueError("non-directory or symlink companion ancestry")
        if not stat.S_ISREG(path.lstat().st_mode):
            raise ValueError("nonregular companion")
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError("companion digest mismatch: " + name)
except (OSError, ValueError) as error:
    print("PB v4 companion HOLD: " + str(error), file=sys.stderr)
    raise SystemExit(2)
os.execv("/usr/bin/python3", ["/usr/bin/python3", "-I", "-S", str(here / "verify-check-profile.v4.py"), *sys.argv[2:]])
PYBOOT
}
proof setup
isolation=$(/usr/bin/mktemp -d /private/tmp/pb-setup-v4.XXXXXXXX)
/bin/chmod 700 "$isolation"
: > "$isolation/npm-userconfig"
: > "$isolation/npm-globalconfig"
printf 'PB dependency preparation=pb-current-fast-v4 isolation=%s\n' "$isolation"
/usr/bin/env -i PATH="$safe_path" HOME="$isolation" TMPDIR=/private/tmp \
  NPM_CONFIG_USERCONFIG="$isolation/npm-userconfig" \
  NPM_CONFIG_GLOBALCONFIG="$isolation/npm-globalconfig" \
  NPM_CONFIG_CACHE="$isolation/npm-cache" \
  NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
  NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false NPM_CONFIG_UPDATE_NOTIFIER=false \
  NEXT_TELEMETRY_DISABLED=1 TUTOR_MODEL=mock PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  "$node" "$npm" ci --ignore-scripts --no-audit --no-fund
# Same checkout, after successful locked dependency preparation, before checks.
proof prepare
printf '%s\n' 'Fast preparation complete; build metadata only, not a types/check pass.'
