#!/bin/sh
# Local tests only: pgbouncer's startup (compose.test-db.yml).
# The Neon proxy logs in to its databases with SCRAM keys derived from the
# server's stored secret, which a plain password in pgbouncer's userlist cannot
# verify: pgbouncer would offer another salt. So the userlist holds the
# server's own secret, read when pgbouncer starts. Its salt is the server's,
# made when the server was first set up, which is why Compose restarts
# pgbouncer with the server.
set -eu

: "${PG_CONNECTION_STRING:?pgbouncer needs PG_CONNECTION_STRING}"
secret="$(psql -X -v ON_ERROR_STOP=1 --tuples-only --no-align "$PG_CONNECTION_STRING" \
  -c "SELECT rolpassword FROM pg_authid WHERE rolname = 'postgres'")"
case "$secret" in
  SCRAM-SHA-256\$*) ;;
  *) echo 'The test server has no SCRAM secret for postgres.' >&2; exit 1 ;;
esac
printf '"postgres" "%s"\n' "$secret" > /etc/pgbouncer/userlist.txt
exec /entrypoint.sh /usr/bin/pgbouncer /etc/pgbouncer/pgbouncer.ini
