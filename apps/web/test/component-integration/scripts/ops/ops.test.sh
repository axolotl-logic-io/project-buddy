#!/usr/bin/env bash
# Contract tests for the ops scripts, against a fake `vercel` that records its
# arguments and writes a fake environment file. No network or real login.
set -euo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
scripts="$(cd -- "$here/../../../../scripts/ops" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/pb-ops.XXXXXX")"
trap 'rm -rf -- "$work"' EXIT

die() { echo "FAIL: $*" >&2; exit 1; }
contains() { grep -Fq -- "$2" "$1" || die "$1 must contain $2"; }
not_contains() { if grep -Fq -- "$2" "$1"; then die "$1 must not contain $2"; fi; }

# A disposable checkout: repo/apps/web/scripts/ops, with a fake vercel on PATH.
checkout="$work/repo/apps/web"
mkdir -p "$checkout/scripts/ops" "$work/bin"
cp "$scripts/"*.sh "$checkout/scripts/ops/"
cat > "$work/bin/vercel" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
printf '%s|%s\n' "$PWD" "$*" >> "$VERCEL_CALLS"
case "$1" in
  link) mkdir -p .vercel && echo '{}' > .vercel/project.json ;;
  env) printf 'DATABASE_URL=postgres://secret-value\nSESSION_SECRET=hush\n' > "$3" ;;
esac
SH
chmod +x "$work/bin/vercel"
export PATH="$work/bin:$PATH" VERCEL_CALLS="$work/calls"

# Linking names the project and team, from apps/web.
bash "$checkout/scripts/ops/link.sh" > /dev/null
contains "$work/calls" "$checkout|link --yes --project project-buddy --scope modest-progress"

# Pulling writes a private file outside the checkout and prints names only.
: > "$work/calls"
export PROJECT_BUDDY_OPS_DIR="$work/ops"
bash "$checkout/scripts/ops/pull-env.sh" production > "$work/out"
contains "$work/calls" "$checkout|env pull $work/ops/production.env --environment=production --yes"
not_contains "$work/calls" "|link"
contains "$work/out" "DATABASE_URL SESSION_SECRET"
not_contains "$work/out" "secret-value"
not_contains "$work/out" "hush"
[[ "$(stat -c %a "$work/ops/production.env" 2>/dev/null || stat -f %Lp "$work/ops/production.env")" == 600 ]] ||
  die "The pulled file must be readable only by its owner"
[[ "$(stat -c %a "$work/ops" 2>/dev/null || stat -f %Lp "$work/ops")" == 700 ]] ||
  die "The ops directory must be private"

# Pulling links first when apps/web isn't linked.
rm -rf "$checkout/.vercel"
: > "$work/calls"
bash "$checkout/scripts/ops/pull-env.sh" preview > /dev/null
contains "$work/calls" "|link --yes"
contains "$work/calls" "--environment=preview"

# A directory inside the checkout is refused, before any vercel call.
: > "$work/calls"
if PROJECT_BUDDY_OPS_DIR="$work/repo/secrets" bash "$checkout/scripts/ops/pull-env.sh" production > "$work/out" 2>&1; then
  die "Pulling into the checkout must fail"
fi
contains "$work/out" "Refusing to pull secrets into the checkout"
[[ ! -s "$work/calls" ]] || die "A refused pull must not call vercel"

# An unknown environment is a usage error.
if bash "$checkout/scripts/ops/pull-env.sh" staging > "$work/out" 2>&1; then
  die "An unknown environment must fail"
fi
contains "$work/out" "Usage: npm run ops:env"

echo "ops scripts: ok"
