// Validated SQL identifiers, excluding the local server’s own databases.
const PLAIN_DATABASE_NAME = /^[a-z_][\d_a-z]*$/u;
const MAX_DATABASE_NAME_LENGTH = 63;
const RESERVED_DATABASE_NAMES: ReadonlySet<string> = new Set([
  "main",
  "postgres",
  "template0",
  "template1",
]);

function databaseName(url: URL): string {
  const name = decodeURIComponent(url.pathname.slice(1));
  if (name === "") {
    throw new Error(
      "DATABASE_URL names no database. The `npm run test-db:*` and test commands need one named in .env.test.",
    );
  }
  if (RESERVED_DATABASE_NAMES.has(name)) {
    throw new Error(
      `DATABASE_URL names "${name}", which is reserved for the Postgres server and the proxy. Name a database of its own in .env.test.`,
    );
  }
  if (name.length > MAX_DATABASE_NAME_LENGTH) {
    throw new Error(
      "DATABASE_URL names a database longer than Postgres’s 63-character identifier limit.",
    );
  }
  if (!PLAIN_DATABASE_NAME.test(name)) {
    throw new Error(
      `DATABASE_URL names "${name}". Use lowercase letters, digits and underscores only.`,
    );
  }
  return name;
}

export { databaseName };
