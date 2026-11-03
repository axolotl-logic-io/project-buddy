# The Vercel team and project that host the site, sourced by the ops scripts.
# The release and preview workflows reach the same project through the repo
# variables VERCEL_ORG_ID and VERCEL_PROJECT_ID.
VERCEL_SCOPE="modest-progress"
VERCEL_PROJECT="project-buddy"
# Pulled environments live here, outside every checkout, so `next build` and
# the test commands never load production settings by accident.
OPS_ENV_DIR="${PROJECT_BUDDY_OPS_DIR:-$HOME/.config/project-buddy}"
