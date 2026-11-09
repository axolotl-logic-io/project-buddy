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

// The highest valid port.
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
function readDatabaseUrl(): string {
  return readRequired("DATABASE_URL");
}

// DATABASE_URL as drizzle-kit takes it: empty when unset or blank, so
// `db:generate` works offline. drizzle-kit rejects the empty url for commands
// that connect, such as `db:migrate`.
function readDatabaseUrlForTooling(): string {
  return readIfSet("DATABASE_URL") ?? "";
}

// DATABASE_URL as the end-to-end test commands take it, from .env.test;
// throws when it is unset or blank. Only scripts/test-db/ reads it, to check
// that it names the local test database.
function readTestDatabaseUrl(): string {
  const value = readIfSet("DATABASE_URL");
  if (value === undefined) {
    throw new Error(
      "DATABASE_URL is not set. The test commands load it from .env.test: copy .env.test.example to .env.test.",
    );
  }
  return value;
}

// The HMAC key that signs the session cookie.
function readSessionSecret(): string {
  return readRequired("SESSION_SECRET");
}

// The Anthropic API key for Claude, or undefined when it is unset or blank.
// The construct reports a missing key the way Anthropic reports a wrong one.
function readAnthropicApiKeyIfSet(): string | undefined {
  return readIfSet("ANTHROPIC_API_KEY");
}

// The separate image provider's credential; no image calls when unset.
function readOpenAiImageKey(): string | undefined {
  return readIfSet("OPENAI_API_KEY");
}

// Vercel's automation bypass secret, or undefined when unset. Only the smoke
// test reads it, to reach a preview behind Deployment Protection.
function readVercelBypassSecretIfSet(): string | undefined {
  return readIfSet("VERCEL_AUTOMATION_BYPASS_SECRET");
}

// Which model constructs run: Claude unless CONSTRUCT_MODEL is "mock", which
// selects the deterministic mock that tests use instead of Anthropic.
// BUDDY_MODEL, its earlier name, is read when CONSTRUCT_MODEL is unset, so
// existing installations and test environments keep working.
// Production deployments (VERCEL_ENV "production") refuse the mock.
function readConstructModel(): "claude" | "mock" {
  const parsed = z
    .enum(["claude", "mock"])
    .safeParse(
      readIfSet("CONSTRUCT_MODEL") ?? readIfSet("BUDDY_MODEL") ?? "claude",
    );
  if (!parsed.success) {
    throw new Error('CONSTRUCT_MODEL must be unset, "claude" or "mock".');
  }
  if (parsed.data === "mock" && readIfSet("VERCEL_ENV") === "production") {
    throw new Error(
      'CONSTRUCT_MODEL is "mock" in production, where constructs must use Claude.',
    );
  }
  return parsed.data;
}

// How the site sends email: through Resend, unless EMAIL_TRANSPORT is
// "outbox", which writes each email to a file in EMAIL_OUTBOX_DIR for the
// end-to-end tests to read. A production deployment (VERCEL_ENV
// "production") refuses the outbox, so no real sign-in email is ever
// written to a file instead of sent.
function readEmailTransport(): "resend" | "outbox" {
  const parsed = z
    .enum(["resend", "outbox"])
    .safeParse(readIfSet("EMAIL_TRANSPORT") ?? "resend");
  if (!parsed.success) {
    throw new Error('EMAIL_TRANSPORT must be unset, "resend" or "outbox".');
  }
  if (parsed.data === "outbox" && readIfSet("VERCEL_ENV") === "production") {
    throw new Error(
      'EMAIL_TRANSPORT is "outbox" in production, where email must go through Resend.',
    );
  }
  return parsed.data;
}

// The address the site's email is sent from, on a domain verified in Resend.
// The outbox transport defaults it to vellum@example.test, so test settings need
// none.
function readEmailFromAddress(): string {
  const value = readIfSet("EMAIL_FROM_ADDRESS");
  if (value === undefined && readEmailTransport() === "outbox") {
    return "vellum@example.test";
  }
  return value ?? readRequired("EMAIL_FROM_ADDRESS");
}

// The environment variables that make readEmailFromAddress return address,
// for a server this process starts, such as the end-to-end tests' servers.
function emailFromAddressEnvironment(
  address: string,
): Readonly<Record<string, string>> {
  return { EMAIL_FROM_ADDRESS: address };
}

// The folder the outbox transport writes emails to, relative to the
// working directory unless absolute.
function readEmailOutboxDir(): string {
  return readRequired("EMAIL_OUTBOX_DIR");
}

// The Resend API key that sends the site's email.
function readResendApiKey(): string {
  return readRequired("RESEND_API_KEY");
}

// The origin of the site's production domain, such as
// "https://example.com", which Vercel names in VERCEL_PROJECT_PRODUCTION_URL
// on every deployment; or undefined off Vercel, such as in local runs and
// the end-to-end tests.
function readProductionOrigin(): string | undefined {
  const host = readIfSet("VERCEL_PROJECT_PRODUCTION_URL");
  if (host === undefined) {
    return undefined;
  }
  return `https://${host}`;
}

// The VAPID key pair and contact that sign the site's push notifications,
// or undefined when none is set, which leaves notifications off. The keys
// are the URL-safe base64 pair `npx web-push generate-vapid-keys` prints;
// the subject is a `mailto:` or `https:` URL where push services can reach
// whoever runs the site. Setting some of the three but not all is an error.
function readVapidKeysIfSet():
  | {
      readonly publicKey: string;
      readonly privateKey: string;
      readonly subject: string;
    }
  | undefined {
  const publicKey = readIfSet("VAPID_PUBLIC_KEY");
  const privateKey = readIfSet("VAPID_PRIVATE_KEY");
  const subject = readIfSet("VAPID_SUBJECT");
  if (
    publicKey === undefined &&
    privateKey === undefined &&
    subject === undefined
  ) {
    return undefined;
  }
  if (
    publicKey === undefined ||
    privateKey === undefined ||
    subject === undefined
  ) {
    throw new Error(
      "Set all of VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT, or none of them.",
    );
  }
  return { publicKey, privateKey, subject };
}

// Which push endpoints the site accepts: only the known push services
// (src/push/push-subscriptions.ts), unless PUSH_ENDPOINTS is "loopback",
// which also accepts http endpoints on localhost or 127.0.0.1 for the server
// tests' fake push service. It is a test setting: any Vercel deployment
// (VERCEL_ENV set, previews included) refuses "loopback".
function readPushEndpoints(): "public" | "loopback" {
  const parsed = z
    .enum(["public", "loopback"])
    .safeParse(readIfSet("PUSH_ENDPOINTS") ?? "public");
  if (!parsed.success) {
    throw new Error('PUSH_ENDPOINTS must be unset, "public" or "loopback".');
  }
  if (parsed.data === "loopback" && readIfSet("VERCEL_ENV") !== undefined) {
    throw new Error(
      'PUSH_ENDPOINTS is "loopback" on a Vercel deployment, where pushes go only to the known push services.',
    );
  }
  return parsed.data;
}

// The secret the scheduler sends to start check-ins, as Vercel Cron sends
// CRON_SECRET in its Authorization header; undefined when unset, so no
// request may start them.
function readCronSecretIfSet(): string | undefined {
  return readIfSet("CRON_SECRET");
}

// Whether a CI runner set CI to a non-empty value.
function isContinuousIntegration(): boolean {
  return readIfSet("CI") !== undefined;
}

// The supplied site port. An incomplete test environment is an error, never
// permission for a command to choose a fallback port.
function readEndToEndPort(): number {
  const value = readIfSet("E2E_PORT");
  if (value === undefined) {
    throw new Error(
      "E2E_PORT is not set. Configure it in the supplied .env.test.",
    );
  }
  const parsed = PORT_NUMBER.safeParse(value);
  if (!parsed.success) {
    throw new Error(`E2E_PORT must be a port number, not "${value}".`);
  }
  return parsed.data;
}

// Test-only until pricing, tax and refund policy have been approved. Live
// keys and production deployments fail closed rather than charging money.
function readBatteryPayments():
  | { key: string; webhookSecret: string; catalog: string; origin: string }
  | undefined {
  const key = readIfSet("STRIPE_TEST_SECRET_KEY");
  if (key === undefined) {
    return undefined;
  }
  if (!key.startsWith("sk_test_") || readIfSet("VERCEL_ENV") === "production") {
    throw new Error(
      "Battery purchases require Stripe test mode outside production.",
    );
  }
  // Preview and development normally share the production Neon database.
  // Test money must never create spendable grants there.
  const databaseHost = new URL(readDatabaseUrl()).hostname;
  if (databaseHost !== "localhost" && databaseHost !== "127.0.0.1") {
    throw new Error(
      "Battery test purchases require an isolated local database.",
    );
  }
  return {
    key,
    webhookSecret: readRequired("STRIPE_TEST_WEBHOOK_SECRET"),
    catalog: readRequired("BATTERY_TEST_CATALOG"),
    origin: z.url().parse(readRequired("STRIPE_TEST_RETURN_ORIGIN")),
  };
}

export {
  emailFromAddressEnvironment,
  isContinuousIntegration,
  readAnthropicApiKeyIfSet,
  readBatteryPayments,
  readConstructModel,
  readCronSecretIfSet,
  readDatabaseUrl,
  readDatabaseUrlForTooling,
  readEmailFromAddress,
  readEmailOutboxDir,
  readEmailTransport,
  readEndToEndPort,
  readOpenAiImageKey,
  readProductionOrigin,
  readPushEndpoints,
  readResendApiKey,
  readSessionSecret,
  readTestDatabaseUrl,
  readVapidKeysIfSet,
  readVercelBypassSecretIfSet,
};
