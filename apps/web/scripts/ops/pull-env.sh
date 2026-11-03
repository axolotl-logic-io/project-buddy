#!/usr/bin/env bash
# `npm run ops:env -- production|preview|development`: pulls that Vercel
# environment's variables to OPS_ENV_DIR/<environment>.env (see project.sh),
# readable only by you, and prints the variable names, never their values.
# Links apps/web first if it isn't linked. Refuses a directory inside the
# checkout, where `next build` or a test command could load the file.
set -euo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
web_root="$(cd -- "$here/../.." && pwd)"
repo_root="$(cd -- "$web_root/../.." && pwd)"
# shellcheck source=project.sh
. "$here/project.sh"

environment="${1:-}"
case "$environment" in
  production | preview | development) ;;
  *) echo "Usage: npm run ops:env -- production|preview|development" >&2; exit 2 ;;
esac

umask 077
mkdir -p -- "$OPS_ENV_DIR"
dir="$(cd -- "$OPS_ENV_DIR" && pwd -P)"
case "$dir/" in
  "$(cd -- "$repo_root" && pwd -P)/"*)
    echo "Refusing to pull secrets into the checkout: $dir. Set PROJECT_BUDDY_OPS_DIR outside it." >&2
    exit 1
    ;;
esac
chmod 700 -- "$dir"

if [[ ! -f "$web_root/.vercel/project.json" ]]; then
  bash "$here/link.sh"
fi
target="$dir/$environment.env"
cd -- "$web_root"
vercel env pull "$target" --environment="$environment" --yes > /dev/null
chmod 600 -- "$target"
echo "Pulled $environment to $target. Variables:"
grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$target" | tr -d '=' | tr '\n' ' '
echo
