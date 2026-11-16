// Gives the project-buddy command a session for local development. It makes
// a developer account in the development database if there is none, and
// writes a session token for that account to apps/cli/.env.local, which the
// root mise.toml loads as PROJECT_BUDDY_SESSION. A token that still signs the
// account in for more than a week is kept.
//
// mise setup runs this through `npm run dev:cli-session`, with the
// development settings in the environment. mise run doctor calls
// cliSessionWorks. Both run after npm ci, so this may import pg.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import pg from "pg";
import {
  createSessionToken,
  MS_PER_DAY,
  readSessionToken,
} from "./session-token.ts";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SESSION_FILE = resolve(WEB_ROOT, "../cli/.env.local");
const SESSION_SETTING = "PROJECT_BUDDY_SESSION";
const DEVELOPER_EMAIL = "developer@project-buddy.test";
const DEVELOPER_NAME = "Developer";
const RENEW_WITHIN_DAYS = 7;
const CONNECTION_TIMEOUT_MS = 3000;
const SECRET_FILE_MODE = 0o600;

interface Developer {
  readonly id: string;
  readonly sessionEpoch: number;
}

function databaseClient(settings: NodeJS.Dict<string>): pg.Client {
  const { DATABASE_URL } = settings;
  return new pg.Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
}

// The developer account, which is made if create is set and it's missing.
async function findDeveloper(
  settings: NodeJS.Dict<string>,
  create: boolean,
): Promise<Developer | undefined> {
  const client = databaseClient(settings);
  await client.connect();
  try {
    if (create) {
      await client.query(
        "INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
        [DEVELOPER_EMAIL, DEVELOPER_NAME],
      );
    }
    const { rows } = await client.query<{ id: string; sessionEpoch: number }>(
      'SELECT id, session_epoch AS "sessionEpoch" FROM users WHERE email = $1',
      [DEVELOPER_EMAIL],
    );
    const [row] = rows;
    if (row === undefined) {
      return undefined;
    }
    return { id: row.id, sessionEpoch: row.sessionEpoch };
  } finally {
    await client.end();
  }
}

function savedToken(): string | undefined {
  if (!existsSync(SESSION_FILE)) {
    return undefined;
  }
  return parseEnv(readFileSync(SESSION_FILE, "utf8"))[SESSION_SETTING];
}

// Whether the token signs the developer in for at least another week.
function tokenLasts(
  token: string | undefined,
  developer: Developer,
  secret: string,
): boolean {
  if (token === undefined) {
    return false;
  }
  const claims = readSessionToken(token, secret);
  return (
    claims !== undefined &&
    claims.id === developer.id &&
    claims.sessionEpoch === developer.sessionEpoch &&
    claims.expiresAtMs > Date.now() + RENEW_WITHIN_DAYS * MS_PER_DAY
  );
}

// Whether the saved session signs the developer in for at least another
// week. It changes nothing.
async function cliSessionWorks(
  settings: NodeJS.Dict<string>,
): Promise<boolean> {
  const { SESSION_SECRET = "" } = settings;
  const developer = await findDeveloper(settings, false);
  return (
    developer !== undefined &&
    tokenLasts(savedToken(), developer, SESSION_SECRET)
  );
}

async function prepareCliSession(settings: NodeJS.Dict<string>): Promise<void> {
  const { SESSION_SECRET } = settings;
  if (!SESSION_SECRET) {
    throw new Error("Set SESSION_SECRET in apps/web/.env.local first.");
  }
  const developer = await findDeveloper(settings, true);
  if (developer === undefined) {
    throw new Error("The developer account was not saved.");
  }
  if (tokenLasts(savedToken(), developer, SESSION_SECRET)) {
    return;
  }
  const token = createSessionToken(developer, SESSION_SECRET, new Date());
  writeFileSync(
    SESSION_FILE,
    `# The local developer account's session, written by mise setup.\n${SESSION_SETTING}=${token}\n`,
    { mode: SECRET_FILE_MODE },
  );
}

if (import.meta.main) {
  try {
    await prepareCliSession(process.env);
  } catch (error) {
    // A database error may name the database URL; report only the step.
    let message =
      "Could not prepare the CLI session in the development database.";
    if (error instanceof Error && error.message.startsWith("Set ")) {
      ({ message } = error);
    }
    console.error(message);
    process.exitCode = 1;
  }
}

export { cliSessionWorks, DEVELOPER_EMAIL };
