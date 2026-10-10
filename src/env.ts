// The one module that reads environment variables. Each accessor reads and
// validates its variable when called, never at import, so `next build` and
// pages that skip the database work without DATABASE_URL. Variables come from
// `process.env`, as Next.js and Vercel provide them. The reindex script and the
// tool configs import this file outside Next, so it uses no Next-only or
// path-aliased imports.
import { z } from "zod";

type RequiredVariableName =
  | "DATABASE_URL"
  | "SESSION_SECRET"
  | "SITE_PASSPHRASE";
type OptionalVariableName = "CI" | "DATABASE_URL";

const REQUIRED_VALUE = z.string().trim().min(1);
const OPTIONAL_VALUE = z.string().optional();

function readRequired(name: RequiredVariableName): string {
  const parsed = REQUIRED_VALUE.safeParse(process.env[name]);
  if (!parsed.success) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local or run \`vercel env pull\`.`,
    );
  }
  return parsed.data;
}

function readOptional(name: OptionalVariableName): string | undefined {
  return OPTIONAL_VALUE.parse(process.env[name]);
}

// The Neon Postgres connection string.
export function readDatabaseUrl(): string {
  return readRequired("DATABASE_URL");
}

// DATABASE_URL as drizzle-kit sees it: missing is allowed, so `db:generate`
// works offline.
export function readDatabaseUrlIfSet(): string | undefined {
  return readOptional("DATABASE_URL");
}

// The HMAC key that signs the session cookie.
export function readSessionSecret(): string {
  return readRequired("SESSION_SECRET");
}

// The passphrase that unlocks the site at /login.
export function readSitePassphrase(): string {
  return readRequired("SITE_PASSPHRASE");
}

// Whether a CI runner set CI to a non-empty value.
export function isContinuousIntegration(): boolean {
  return (readOptional("CI") ?? "") !== "";
}
