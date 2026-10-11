// The one module that reads environment variables. Each accessor reads and
// validates its variable when called, never at import, so `next build` and
// pages that skip the database work without DATABASE_URL. Variables come from
// `process.env`, as Next.js and Vercel provide them. The reindex script and the
// tool configs import this file outside Next, so it uses no Next-only or
// path-aliased imports.
//
// Every value is trimmed, and a blank value counts as unset. Each accessor
// below is a self-contained block: add a variable as a new block.
import { z } from "zod";

const SET_VALUE = z.string().trim().min(1);

// E2E_PORT's default and the highest valid port.
const DEFAULT_END_TO_END_PORT = 3100;
const HIGHEST_PORT = 65_535;
const PORT_NUMBER = z.coerce.number().int().positive().max(HIGHEST_PORT);

// The variable's trimmed value, or undefined when it is unset or blank.
function readIfSet(name: string): string | undefined {
  return SET_VALUE.safeParse(process.env[name]).data;
}

// The variable's trimmed value; throws when it is unset or blank.
function readRequired(name: string): string {
  const value = readIfSet(name);
  if (value === undefined) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local or run \`vercel env pull\`.`,
    );
  }
  return value;
}

// The Neon Postgres connection string.
export function readDatabaseUrl(): string {
  return readRequired("DATABASE_URL");
}

// DATABASE_URL as drizzle-kit takes it: empty when unset or blank, so
// `db:generate` works offline. drizzle-kit rejects the empty url for commands
// that connect, such as `db:migrate`.
export function readDatabaseUrlForTooling(): string {
  return readIfSet("DATABASE_URL") ?? "";
}

// DATABASE_URL as the end-to-end test commands take it, from .env.test;
// throws when it is unset or blank. Only scripts/test-db/ reads it, to check
// that it names the local test database.
export function readTestDatabaseUrl(): string {
  const value = readIfSet("DATABASE_URL");
  if (value === undefined) {
    throw new Error(
      "DATABASE_URL is not set. The test commands load it from .env.test: copy .env.test.example to .env.test.",
    );
  }
  return value;
}

// The environment variables that make readDatabaseUrl return databaseUrl, for
// a server this process starts, such as the end-to-end tests' second server.
export function databaseUrlEnvironment(
  databaseUrl: string,
): Readonly<Record<string, string>> {
  return { DATABASE_URL: databaseUrl };
}

// The HMAC key that signs the session cookie.
export function readSessionSecret(): string {
  return readRequired("SESSION_SECRET");
}

// The passphrase that unlocks the site at /login.
export function readSitePassphrase(): string {
  return readRequired("SITE_PASSPHRASE");
}

// The Anthropic API key for Claude, or undefined when it is unset or blank.
// The tutor reports a missing key the way Anthropic reports a wrong one.
export function readAnthropicApiKeyIfSet(): string | undefined {
  return readIfSet("ANTHROPIC_API_KEY");
}

// Which model the tutor runs: Claude unless TUTOR_MODEL is "mock", which
// selects the deterministic mock that tests use instead of Anthropic.
export function readTutorModel(): "claude" | "mock" {
  const parsed = z
    .enum(["claude", "mock"])
    .safeParse(readIfSet("TUTOR_MODEL") ?? "claude");
  if (!parsed.success) {
    throw new Error('TUTOR_MODEL must be unset, "claude" or "mock".');
  }
  return parsed.data;
}

// Whether a CI runner set CI to a non-empty value.
export function isContinuousIntegration(): boolean {
  return readIfSet("CI") !== undefined;
}

// The port the end-to-end tests serve the app on: E2E_PORT, from .env.test,
// or 3100 when it is missing or blank.
export function readEndToEndPort(): number {
  const value = readIfSet("E2E_PORT");
  if (value === undefined) {
    return DEFAULT_END_TO_END_PORT;
  }
  const parsed = PORT_NUMBER.safeParse(value);
  if (!parsed.success) {
    throw new Error(`E2E_PORT must be a port number, not "${value}".`);
  }
  return parsed.data;
}
