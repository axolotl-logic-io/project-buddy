// `npm run ops:query -- <environment> "<sql>"`: runs one SQL statement against
// that environment's database, from the file `npm run ops:env` pulled, inside
// a read-only transaction that is always rolled back, with a 15 s statement
// timeout. Postgres refuses any write, so this can only look. Prints the rows
// as JSON. The connection string is never printed.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { parseEnv } from "node:util";
import { Pool, type PoolClient } from "@neondatabase/serverless";

// A variable's value, or undefined when it's unset or empty. A pulled sensitive
// variable can come back as an empty string.
function setting(
  settings: NodeJS.Dict<string>,
  name: string,
): string | undefined {
  const value = settings[name];
  if (value === "") {
    return undefined;
  }
  return value;
}

const ENVIRONMENTS: readonly string[] = [
  "production",
  "preview",
  "development",
];
const USAGE =
  'Usage: npm run ops:query -- production|preview|development "<sql>"';

const [environment, sql] = process.argv.slice(2);
if (
  environment === undefined ||
  !ENVIRONMENTS.includes(environment) ||
  sql === undefined ||
  sql.trim() === ""
) {
  console.error(USAGE);
  process.exit(2);
}

// The same directory as scripts/ops/project.sh's OPS_ENV_DIR.
const dir: string =
  setting(process.env, "PROJECT_BUDDY_OPS_DIR") ??
  join(homedir(), ".config/project-buddy");
const file: string = join(dir, `${environment}.env`);
let variables: NodeJS.Dict<string>;
try {
  variables = parseEnv(readFileSync(file, "utf8"));
} catch {
  console.error(`No ${file}. Run \`npm run ops:env -- ${environment}\` first.`);
  process.exit(1);
}
const connectionString: string =
  setting(variables, "DATABASE_URL_UNPOOLED") ??
  setting(variables, "DATABASE_URL") ??
  "";
if (connectionString === "") {
  console.error(`${file} has no DATABASE_URL.`);
  process.exit(1);
}

const pool: Pool = new Pool({ connectionString });
const client: PoolClient = await pool.connect();
try {
  await client.query("BEGIN READ ONLY");
  await client.query("SET LOCAL statement_timeout = '15s'");
  const result = await client.query(sql);
  console.log(JSON.stringify(result.rows, null, 2));
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  client.release();
  await pool.end();
}
