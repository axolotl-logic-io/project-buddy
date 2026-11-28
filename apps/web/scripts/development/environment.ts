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
// The account that mise run sign-in-link signs in without an address.
const DEVELOPER_EMAIL = "developer@project-buddy.test";
const DEVELOPER_NAME = "Developer";

function defaults(webRoot: string): NodeJS.Dict<string> {
  return parseEnv(
    readFileSync(
      join(webRoot, "scripts/development/local.env.example"),
      "utf8",
    ),
  );
}

// The development settings Next would see, from its env files and the
// inherited environment. A DATABASE_URL among them is never used: `mise run
// dev` gives the site this branch's own development database.
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
  let file = join(webRoot, ".env.local");
  const developmentFile = join(webRoot, ".env.development.local");
  if (existsSync(developmentFile)) {
    file = developmentFile;
  }
  const content = `\n# Local development defaults added by mise run setup.\n${additions.join("\n")}\n`;
  if (existsSync(file)) {
    appendFileSync(file, content);
  } else {
    writeFileSync(file, content, { flag: "wx", mode: 0o600 });
  }
}

function configurationProblems(settings: NodeJS.Dict<string>): string[] {
  const problems: string[] = [];
  const { SESSION_SECRET, EMAIL_TRANSPORT, EMAIL_OUTBOX_DIR } = settings;
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
  configurationProblems,
  DEVELOPER_EMAIL,
  DEVELOPER_NAME,
  localSettings,
  prepareEnvironment,
};
