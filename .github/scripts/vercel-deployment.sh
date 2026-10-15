#!/usr/bin/env bash
# Print a Vercel deployment's JSON from the REST API:
#
#   .github/scripts/vercel-deployment.sh <url or host> [<seconds to wait>]
#
# The host may be a deployment's own URL or an alias such as the production
# domain. With a wait, it polls until the deployment is READY, ERROR or
# CANCELED, or the time runs out, and prints the last answer either way; the
# caller checks .readyState. Needs VERCEL_TOKEN and VERCEL_ORG_ID (the team).
#
# The release and integration workflows use this rather than `vercel inspect`,
# which answers "User not found" with the workflows' token.
set -euo pipefail

host="${1:?usage: vercel-deployment.sh <url or host> [<seconds to wait>]}"
host="${host#https://}"
host="${host%%/*}"
wait_seconds="${2:-0}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is not set}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is not set}"

fetch() {
  curl --fail-with-body --silent --show-error --retry 3 \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v13/deployments/$host?teamId=$VERCEL_ORG_ID"
}

deadline=$((SECONDS + wait_seconds))
while :; do
  answer="$(fetch)"
  state="$(jq -r '.readyState // empty' <<<"$answer")"
  case "$state" in
    READY | ERROR | CANCELED) break ;;
  esac
  if [ "$SECONDS" -ge "$deadline" ]; then
    break
  fi
  sleep 10
done
printf '%s\n' "$answer"
