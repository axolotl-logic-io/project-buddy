#!/usr/bin/env bash
# Strict stateful stand-in: unknown commands fail, never delegate to Docker.
set -euo pipefail
: "${FAKE_DOCKER_STATE:?The test must supply its private Docker state}"
state="$FAKE_DOCKER_STATE"
printf '%q ' "$@" >> "$state/calls"
printf '\n' >> "$state/calls"
fail() { echo "fake docker: $*" >&2; exit 1; }
mutation() { printf '%s\n' "$*" >> "$state/mutations"; }

case "$1" in
  compose)
    [[ $# == 8 && "$2" == --project-name && "$3" == project-buddy-test-db &&
       "$4" == --file && "$5" == */compose.test-db.yml && -f "$5" &&
       "$6" == up && "$7" == --detach && "$8" == --wait ]] || fail 'unexpected compose command'
    [[ "${FAKE_SETUP_FAILURE:-}" != compose ]] || fail 'compose startup failed'
    mutation 'compose up'
    mkdir -p "$state/containers/project-buddy-test-db-postgres-1"
    ;;
  container)
    [[ "$*" == "container ls --all --format {{.Names}}" ]] || fail 'unexpected listing'
    [[ "${FAKE_INSPECTION:-}" != list-failure ]] || fail 'listing failed'
    for path in "$state"/containers/*; do
      [[ -d "$path" ]] && basename "$path"
    done
    true
    ;;
  image)
    [[ $# == 5 && "$2" == inspect && "$3" == --format &&
       "$4" == '{{json .Config.Entrypoint}}|{{json .Config.Cmd}}' &&
       "$5" == ghcr.io/timowilhelm/local-neon-http-proxy@sha256:* ]] || fail 'unexpected image inspection'
    [[ "${FAKE_INSPECTION:-}" != image-inspection ]] || fail 'image inspection failed'
    printf '%s\n' '["/proxy-entrypoint"]|["serve"]'
    ;;
  inspect)
    name="${@: -1}"
    if [[ "$name" == project-buddy-test-db-postgres-1 ]]; then
      case "${FAKE_INSPECTION:-}" in
        unavailable) fail 'shared server unavailable' ;;
        not-running) echo false ;;
        garbled) echo unknown ;;
        *) echo true ;;
      esac
    else
      [[ "${FAKE_INSPECTION:-}" != proxy-inspection ]] || fail 'proxy inspection failed'
      if [[ "$3" == *'{{json .Config.Entrypoint}}|{{json .Config.Cmd}}' ]]; then
        cat "$state/containers/$name/configuration"
      else
        cut -d '|' -f 1-6 "$state/containers/$name/configuration"
      fi
    fi
    ;;
  run)
    shift
    name= network= publication= connection= image=
    while (( $# )); do
      case "$1" in
        --detach) shift ;;
        --name) name="$2"; shift 2 ;;
        --network) network="$2"; shift 2 ;;
        --publish) publication="$2"; shift 2 ;;
        --env) connection="$2"; shift 2 ;;
        *) image="$1"; shift ;;
      esac
    done
    [[ -n "$name" && -n "$publication" ]] || fail 'incomplete proxy command'
    [[ "${FAKE_SETUP_FAILURE:-}" != proxy-run ]] || fail 'proxy startup failed'
    [[ ! -e "$state/containers/$name" ]] || fail 'container already exists'
    mkdir "$state/containers/$name"
    host="${publication%%:*}"
    ports="${publication#*:}"
    port="${ports%%:*}"
    printf '%s|true|%s|%s|{"4444/tcp":[{"HostIp":"%s","HostPort":"%s"}]}|1|["/proxy-entrypoint"]|["serve"]\n' \
      "$image" "$network" "$connection" "$host" "$port" > "$state/containers/$name/configuration"
    mutation "run $name"
    ;;
  rm)
    [[ "$2" == --force && $# == 3 ]] || fail 'unexpected removal'
    rm -rf -- "$state/containers/$3"
    mutation "rm $3"
    ;;
  exec)
    [[ "$2" == project-buddy-test-db-postgres-1 && "$3" == psql ]] || fail 'unexpected database connection'
    sql="${@: -1}"
    case "$sql" in
      'SELECT json_agg(datname ORDER BY datname) FROM pg_database')
        case "${FAKE_INSPECTION:-}" in
          inventory-failure) fail 'inventory query failed' ;;
          bad-json) echo 'not an inventory' ;;
          empty) echo '[]' ;;
          wrong-type) echo '["main", 3]' ;;
          missing-core) echo '["pb_lane_3"]' ;;
          duplicate) echo '["main","postgres","template0","template1","pb_lane_3","pb_lane_3"]' ;;
          line-break) printf '%s\n' '["main","postgres","template0","template1","pb_lane_3","other\nname"]' ;;
          empty-name) echo '["main","postgres","template0","template1","pb_lane_3",""]' ;;
          *)
            if [[ -f "$state/inventory" ]]; then cat "$state/inventory"; else
              awk 'BEGIN {printf "["} {if (NR>1) printf ","; printf "\"%s\"", $0} END {print "]"}' "$state/databases"
            fi ;;
        esac
        ;;
      'SELECT 1 FROM pg_database WHERE datname = '* )
        case "${FAKE_SETUP_FAILURE:-}" in
          existence-query) fail 'existence query failed' ;;
          existence-result) echo unknown; exit 0 ;;
        esac
        name="${sql#*\'}"; name="${name%\'}"
        if grep -Fxq "$name" "$state/databases"; then echo 1; fi
        ;;
      'CREATE DATABASE '*)
        [[ "${FAKE_SETUP_FAILURE:-}" != create ]] || fail 'database creation failed'
        name="${sql#CREATE DATABASE }"
        ! grep -Fxq "$name" "$state/databases" || fail 'database already exists'
        echo "$name" >> "$state/databases"
        mutation "create $name"
        ;;
      'DROP DATABASE IF EXISTS '*' WITH (FORCE)')
        name="${sql#DROP DATABASE IF EXISTS }"; name="${name% WITH (FORCE)}"
        grep -Fxv "$name" "$state/databases" > "$state/databases.next" || true
        mv "$state/databases.next" "$state/databases"
        mutation "drop $name"
        ;;
      *) fail "unexpected SQL: $sql" ;;
    esac
    ;;
  *) fail "unexpected command: $*" ;;
esac
