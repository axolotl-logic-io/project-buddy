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
# The nearest directory of OPS_ENV_DIR that exists, so the check runs before
# anything is made.
existing="$OPS_ENV_DIR"
while [[ ! -d "$existing" ]]; do existing="$(dirname -- "$existing")"; done
existing="$(cd -- "$existing" && pwd -P)"
inside_checkout=false
case "$existing/" in
  "$(cd -- "$repo_root" && pwd -P)/"*) inside_checkout=true ;;
esac
# Any git checkout counts, such as a sibling worktree of this one.
if git -C "$existing" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  inside_checkout=true
fi
if [[ "$inside_checkout" == true ]]; then
  echo "Refusing to pull secrets into the checkout: $OPS_ENV_DIR. Set PROJECT_BUDDY_OPS_DIR outside it." >&2
  exit 1
fi
mkdir -p -- "$OPS_ENV_DIR"
dir="$(cd -- "$OPS_ENV_DIR" && pwd -P)"
chmod 700 "$dir"

if [[ ! -f "$web_root/.vercel/project.json" ]]; then
  bash "$here/link.sh"
fi
target="$dir/$environment.env"
# A fresh file: an old one could be a symlink into a checkout, or readable by
# others while vercel writes it.
rm -f -- "$target"
cd -- "$web_root"
vercel env pull "$target" --environment="$environment" --yes > /dev/null
chmod 600 "$target"
echo "Pulled $environment to $target. Variables:"
grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$target" | tr -d '=' | tr '\n' ' '
echo
