import { createHash, randomBytes } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";

const SESSION_SECRET_BYTES = 32;
// The account that mise setup gives the project-buddy command a session for,
// and that mise run sign-in-link signs in without an address.
const DEVELOPER_EMAIL = "developer@project-buddy.test";
const DEVELOPER_NAME = "Developer";

// The Compose development server (compose.dev-db.yml). Each worktree has a
// database of its own on it, so one branch's migrations never reach another's.
const DEVELOPMENT_SERVER = "postgres://127.0.0.1:5434";
// The local-only user and password in compose.dev-db.yml.
const DEVELOPMENT_SERVER_USER = "postgres";
const DEVELOPMENT_DATABASE_PREFIX = "pb_dev_";
const DATABASE_KEY_LENGTH = 12;
const DATABASE_SETTING = "DATABASE_URL";

function developmentServerUrl(database: string): string {
  const url = new URL(`${DEVELOPMENT_SERVER}/${database}`);
  url.username = DEVELOPMENT_SERVER_USER;
  url.password = DEVELOPMENT_SERVER_USER;
  return url.href;
}

// The database every worktree shared before each had its own.
const SHARED_DATABASE_URL = developmentServerUrl("project_buddy_dev");

// This worktree's development database: the same name for the same path.
function developmentDatabaseUrl(webRoot: string): string {
  const key = createHash("sha256")
    .update(resolve(webRoot))
    .digest("hex")
    .slice(0, DATABASE_KEY_LENGTH);
  return developmentServerUrl(`${DEVELOPMENT_DATABASE_PREFIX}${key}`);
}

function defaults(webRoot: string): NodeJS.Dict<string> {
  const settings = parseEnv(
    readFileSync(
      join(webRoot, "scripts/development/local.env.example"),
      "utf8",
    ),
  );
  settings[DATABASE_SETTING] = developmentDatabaseUrl(webRoot);
  return settings;
}

// Setup owns only the persistent Compose development database. In particular,
// loopback alone is insufficient: the test server also listens on loopback.
function localSettings(
  webRoot: string,
  overrides: NodeJS.ProcessEnv,
): NodeJS.Dict<string> {
  let settings: NodeJS.Dict<string> = {};
  // Match Next's development precedence, including inherited shell settings.
  for (const name of [
    ".env",
    ".env.development",
    ".env.local",
    ".env.development.local",
  ]) {
    const file = join(webRoot, name);
    if (existsSync(file)) {
      try {
        settings = { ...settings, ...parseEnv(readFileSync(file, "utf8")) };
      } catch (cause) {
        throw new Error(
          "Cannot read development configuration; check file permissions and syntax.",
          { cause },
        );
      }
    }
  }
  for (const name of [...Object.keys(defaults(webRoot)), "SESSION_SECRET"]) {
    const value = overrides[name];
    if (value !== undefined) {
      settings[name] = value;
    }
  }
  const { DATABASE_URL: localDatabase } = defaults(webRoot);
  const { DATABASE_URL = localDatabase } = { ...settings, ...overrides };
  if (DATABASE_URL === SHARED_DATABASE_URL) {
    throw new Error(
      "Each worktree now has its own development database. Run mise setup to switch DATABASE_URL in apps/web/.env.local to it.",
    );
  }
  if (DATABASE_URL && DATABASE_URL !== localDatabase) {
    throw new Error(
      "Use this worktree's development DATABASE_URL, which mise setup writes; see README.md. Setup and doctor refuse other databases; existing settings were kept.",
    );
  }
  return settings;
}

// The environment for the test database commands, which read .env.test. Node's
// --env-file never overrides an inherited setting, so a shell DATABASE_URL for
// the development database would otherwise be the one they reset.
function testCommandEnvironment(
  webRoot: string,
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const result = { ...environment };
  for (const name of [
    ...Object.keys(defaults(webRoot)),
    "SESSION_SECRET",
    "E2E_PORT",
  ]) {
    delete result[name];
  }
  return result;
}

function isHostedDatabase(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
      url.hostname !== "" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

// Adopts the old shared local database, or adds a development-only override
// for a hosted .env.local. Neither existing database is changed.
function adoptWorktreeDatabase(
  webRoot: string,
  overrides: NodeJS.ProcessEnv,
): void {
  const file = join(webRoot, ".env.local");
  if (!existsSync(file)) {
    return;
  }
  const { DATABASE_URL: inheritedDatabase } = overrides;
  const contents = readFileSync(file, "utf8");
  const { DATABASE_URL } = parseEnv(contents);
  const developmentFile = join(webRoot, ".env.development.local");
  let developmentDatabase: string | undefined;
  if (existsSync(developmentFile)) {
    ({ DATABASE_URL: developmentDatabase } = parseEnv(
      readFileSync(developmentFile, "utf8"),
    ));
  }
  // A pulled hosted configuration can stay available to other modes. Only
  // the development mode gets a local target; explicit overrides still win.
  if (
    DATABASE_URL &&
    isHostedDatabase(DATABASE_URL) &&
    inheritedDatabase === undefined &&
    !developmentDatabase
  ) {
    const content = `\n# Local development database added by mise setup.\nDATABASE_URL=${developmentDatabaseUrl(webRoot)}\n`;
    if (existsSync(developmentFile)) {
      appendFileSync(developmentFile, content);
    } else {
      writeFileSync(developmentFile, content, { flag: "wx", mode: 0o600 });
    }
    return;
  }
  const shared = `DATABASE_URL=${SHARED_DATABASE_URL}`;
  const lines = readFileSync(file, "utf8").split("\n");
  if (!lines.includes(shared)) {
    return;
  }
  const own = `DATABASE_URL=${developmentDatabaseUrl(webRoot)}`;
  const adopted = lines.map((line) => {
    if (line === shared) {
      return own;
    }
    return line;
  });
  writeFileSync(file, adopted.join("\n"));
}

function prepareEnvironment(
  webRoot: string,
  overrides: NodeJS.ProcessEnv,
): void {
  const settings = localSettings(webRoot, overrides);
  const additions: string[] = [];
  for (const [name, value] of Object.entries(defaults(webRoot))) {
    if (!settings[name] && value !== undefined) {
      additions.push(`${name}=${value}`);
    }
  }
  const { SESSION_SECRET } = settings;
  if (!SESSION_SECRET) {
    const secret = randomBytes(SESSION_SECRET_BYTES).toString("base64");
    additions.push(`SESSION_SECRET=${secret}`);
  }
  if (additions.length === 0) {
    return;
  }
  let file = join(webRoot, ".env.local");
  const developmentFile = join(webRoot, ".env.development.local");
  if (existsSync(developmentFile)) {
    file = developmentFile;
  }
  const content = `\n# Local development defaults added by mise setup.\n${additions.join("\n")}\n`;
  if (existsSync(file)) {
    appendFileSync(file, content);
  } else {
    writeFileSync(file, content, { flag: "wx", mode: 0o600 });
  }
}

function configurationProblems(settings: NodeJS.Dict<string>): string[] {
  const problems: string[] = [];
  const { SESSION_SECRET, EMAIL_TRANSPORT, EMAIL_OUTBOX_DIR, DATABASE_URL } =
    settings;
  if (!DATABASE_URL) {
    problems.push("Set DATABASE_URL in apps/web/.env.local; see README.md.");
  }
  if (!SESSION_SECRET) {
    problems.push(
      "Set SESSION_SECRET in apps/web/.env.local; see .env.example.",
    );
  }
  if (EMAIL_TRANSPORT !== "outbox" || !EMAIL_OUTBOX_DIR) {
    problems.push(
      "Set EMAIL_TRANSPORT=outbox and EMAIL_OUTBOX_DIR in apps/web/.env.local for local sign-in without email credentials.",
    );
  }
  return problems;
}

export {
  adoptWorktreeDatabase,
  configurationProblems,
  DEVELOPER_EMAIL,
  DEVELOPER_NAME,
  developmentDatabaseUrl,
  localSettings,
  prepareEnvironment,
  testCommandEnvironment,
};
