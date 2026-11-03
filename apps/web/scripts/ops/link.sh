#!/usr/bin/env bash
# `npm run ops:link`: links apps/web to the site's Vercel project, writing the
# ignored .vercel/project.json, so `vercel logs`, `vercel env` and the other
# ops scripts work without --scope. Needs a personal `vercel login`.
set -euo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
web_root="$(cd -- "$here/../.." && pwd)"
# shellcheck source=project.sh
. "$here/project.sh"
cd -- "$web_root"
vercel link --yes --project "$VERCEL_PROJECT" --scope "$VERCEL_SCOPE"
