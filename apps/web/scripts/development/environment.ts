import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const SESSION_SECRET_BYTES = 32;

function defaults(webRoot: string): NodeJS.Dict<string> {
  return parseEnv(
    readFileSync(
      join(webRoot, "scripts/development/local.env.example"),
      "utf8",
    ),
  );
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
  if (DATABASE_URL && DATABASE_URL !== localDatabase) {
    throw new Error(
      "Use the Compose development DATABASE_URL from README.md. Setup and doctor refuse other databases; existing settings were kept.",
    );
  }
  return settings;
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
  const file = join(webRoot, ".env.local");
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

export { configurationProblems, localSettings, prepareEnvironment };
