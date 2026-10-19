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
const PORT_TOKEN_LENGTH = 32;
const PORT_TOKEN = /^[\da-f]+$/u;
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
// The tutor reports a missing key the way Anthropic reports a wrong one.
function readAnthropicApiKeyIfSet(): string | undefined {
  return readIfSet("ANTHROPIC_API_KEY");
}

// Vercel's automation bypass secret, or undefined when unset. Only the smoke
// test reads it, to reach a preview behind Deployment Protection.
function readVercelBypassSecretIfSet(): string | undefined {
  return readIfSet("VERCEL_AUTOMATION_BYPASS_SECRET");
}

// Which model the tutor runs: Claude unless TUTOR_MODEL is "mock", which
// selects the deterministic mock that tests use instead of Anthropic.
function readTutorModel(): "claude" | "mock" {
  const parsed = z
    .enum(["claude", "mock"])
    .safeParse(readIfSet("TUTOR_MODEL") ?? "claude");
  if (!parsed.success) {
    throw new Error('TUTOR_MODEL must be unset, "claude" or "mock".');
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
// The outbox transport defaults it to hippy@example.test, so test settings need
// none.
function readEmailFromAddress(): string {
  const value = readIfSet("EMAIL_FROM_ADDRESS");
  if (value === undefined && readEmailTransport() === "outbox") {
    return "hippy@example.test";
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

// Whether a CI runner set CI to a non-empty value.
function isContinuousIntegration(): boolean {
  return readIfSet("CI") !== undefined;
}

// The port E2E_PORT sets explicitly, from .env.test or the environment, or
// undefined when it is missing or blank, so a test run takes a free one.
function readEndToEndPortIfSet(): number | undefined {
  const value = readIfSet("E2E_PORT");
  if (value === undefined) {
    return undefined;
  }
  const parsed = PORT_NUMBER.safeParse(value);
  if (!parsed.success) {
    throw new Error(`E2E_PORT must be a port number, not "${value}".`);
  }
  return parsed.data;
}

// The port the end-to-end tests serve the app on: E2E_PORT, which a test
// run sets, or 3100 when it is missing or blank.
function readEndToEndPort(): number {
  return readEndToEndPortIfSet() ?? DEFAULT_END_TO_END_PORT;
}

// This process's environment, for a command a test run starts, with
// DATABASE_URL and E2E_PORT set to the run's database and port.
function testRunEnvironment(
  databaseUrl: string | undefined,
  port: number | undefined,
  portToken?: string,
): NodeJS.ProcessEnv {
  let portValue: string | undefined;
  if (port !== undefined) {
    portValue = `${port}`;
  }
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    E2E_PORT: portValue,
    PB_TEST_PORT_TOKEN: portToken,
  };
}

// The wrapper's random local port-release capability, absent for direct runs.
function readTestPortTokenIfSet(): string | undefined {
  const token = readIfSet("PB_TEST_PORT_TOKEN");
  if (token === undefined) {
    return undefined;
  }
  return z.string().length(PORT_TOKEN_LENGTH).regex(PORT_TOKEN).parse(token);
}

const RUN_PROTOCOL = z.object({
  socket: z.string().min(1),
  token: z.string().regex(PORT_TOKEN).length(PORT_TOKEN_LENGTH),
  entry: z.string().url(),
});
type TestRunProtocol = z.infer<typeof RUN_PROTOCOL>;

// A local lifecycle capability, inherited only by this invocation's children.
function readTestRunProtocol(): TestRunProtocol | undefined {
  const value = readIfSet("PB_TEST_RUN");
  if (value === undefined) {
    return undefined;
  }
  return RUN_PROTOCOL.parse(JSON.parse(value));
}

// Keep all environment access here, including child-process fixtures. The
// sentinel itself is not preloaded; its command and Node descendants are.
function testProcessEnvironment(
  protocol: TestRunProtocol,
  preload: boolean,
  inherited: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const option = ` --import=${JSON.stringify(protocol.entry)}`;
  const { NODE_OPTIONS: previous = "" } = inherited;
  let options = previous.replaceAll(option, "");
  if (preload) {
    options += option;
  }
  return {
    ...inherited,
    PB_TEST_RUN: JSON.stringify(protocol),
    NODE_OPTIONS: options,
  };
}

export type { TestRunProtocol };
export {
  emailFromAddressEnvironment,
  isContinuousIntegration,
  readAnthropicApiKeyIfSet,
  readDatabaseUrl,
  readDatabaseUrlForTooling,
  readEmailFromAddress,
  readEmailOutboxDir,
  readEmailTransport,
  readEndToEndPort,
  readEndToEndPortIfSet,
  readProductionOrigin,
  readResendApiKey,
  readSessionSecret,
  readTestDatabaseUrl,
  readTestPortTokenIfSet,
  readTestRunProtocol,
  readTutorModel,
  readVercelBypassSecretIfSet,
  testProcessEnvironment,
  testRunEnvironment,
};
