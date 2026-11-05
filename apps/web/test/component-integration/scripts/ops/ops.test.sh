#!/usr/bin/env bash
# Contract tests for the ops scripts, against a fake `vercel` that records its
# arguments and writes a fake environment file. No network or real login.
set -euo pipefail
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
scripts="$(cd -- "$here/../../../../scripts/ops" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/pb-ops.XXXXXX")"
work="$(cd -- "$work" && pwd -P)"
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
[[ ! -e "$work/repo/secrets" ]] || die "A refused pull must not make its directory"

# So is a directory in any other git checkout, such as a sibling worktree.
git init -q "$work/sibling"
if PROJECT_BUDDY_OPS_DIR="$work/sibling/secrets" bash "$checkout/scripts/ops/pull-env.sh" production > "$work/out" 2>&1; then
  die "Pulling into another checkout must fail"
fi
contains "$work/out" "Refusing to pull secrets into the checkout"
[[ ! -e "$work/sibling/secrets" ]] || die "A refused pull must not make its directory"

# An old file is replaced, not written through: a symlink into the checkout
# keeps its target untouched, and a loose file is never written loose.
echo "untouched" > "$work/repo/leak.env"
ln -sf "$work/repo/leak.env" "$work/ops/production.env"
bash "$checkout/scripts/ops/pull-env.sh" production > /dev/null
[[ ! -L "$work/ops/production.env" ]] || die "The pulled file must not be a symlink"
contains "$work/repo/leak.env" "untouched"
not_contains "$work/repo/leak.env" "secret-value"
chmod 644 "$work/ops/production.env"
cat > "$work/bin/vercel" <<'SH'
#!/usr/bin/env bash
printf 'DATABASE_URL=postgres://secret-value\n' > "$3"
stat -c %a "$3" 2>/dev/null > "$VERCEL_CALLS" || stat -f %Lp "$3" > "$VERCEL_CALLS"
exit 1
SH
if bash "$checkout/scripts/ops/pull-env.sh" production > /dev/null 2>&1; then
  die "A failed vercel pull must fail"
fi
[[ "$(cat "$work/calls")" == 600 ]] || die "The pulled file must be private while vercel writes it"

# An unknown environment is a usage error.
if bash "$checkout/scripts/ops/pull-env.sh" staging > "$work/out" 2>&1; then
  die "An unknown environment must fail"
fi
contains "$work/out" "Usage: npm run ops:env"

echo "ops scripts: ok"
