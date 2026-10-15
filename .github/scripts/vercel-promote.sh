#!/usr/bin/env bash
# Make a deployment the project's production deployment through Vercel's REST
# API:
#
#   .github/scripts/vercel-promote.sh <deployment id>
#
# Exits 0 once Vercel accepts the promotion (any 2xx; Vercel documents 201 and
# 202). Otherwise prints the HTTP status and Vercel's answer to stderr and
# exits non-zero. Vercel may finish the promotion after it answers, so the
# caller checks the production domain with vercel-deployment.sh. Needs
# VERCEL_TOKEN, VERCEL_ORG_ID (the team) and VERCEL_PROJECT_ID.
#
# The release workflow uses this rather than `vercel promote`, which answers
# "User not found" with the workflows' token (#239).
set -euo pipefail

id="${1:?usage: vercel-promote.sh <deployment id>}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is not set}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is not set}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is not set}"

answer="$(mktemp)"
trap 'rm -f "$answer"' EXIT

curl_status=0
http_status="$(curl --silent --show-error --retry 3 --request POST \
  --output "$answer" --write-out '%{http_code}' \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/promote/$id?teamId=$VERCEL_ORG_ID")" ||
  curl_status=$?

if [ "$curl_status" -eq 0 ]; then
  case "$http_status" in
    2??)
      echo "Vercel accepted the promotion of $id (HTTP $http_status)"
      exit 0
      ;;
  esac
fi

{
  echo "Vercel did not promote $id: HTTP ${http_status:-none}, curl exit $curl_status"
  cat "$answer"
  echo
} >&2
exit 1
