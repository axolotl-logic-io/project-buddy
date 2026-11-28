// The settings the server and system test suites run with. Their configs
// (vitest.server.config.mts, playwright.config.ts) apply them over the
// inherited environment, so no settings file is needed and a shell's
// DATABASE_URL or a real email setting never reaches a test.
//
// Each suite has a database of its own (scripts/db/database-names.ts), so
// the two run at once, and an outbox of its own.
import process from "node:process";
import { localDatabase } from "../db/database-names.ts";

type Suite = "server" | "system";

// Signs the tests' session cookies only; nothing outside a test trusts it.
const TEST_SESSION_SECRET = "test-only-session-secret-not-for-any-real-site";

function suiteEnvironment(suite: Suite): Record<string, string> {
  return {
    DATABASE_URL: localDatabase(suite).url,
    EMAIL_TRANSPORT: "outbox",
    EMAIL_OUTBOX_DIR: `test-results/email-outbox/${suite}`,
    SESSION_SECRET: TEST_SESSION_SECRET,
  };
}

// Applies suite's settings to this process, and so to the processes it
// starts, such as Playwright's workers and web server.
function applySuiteEnvironment(suite: Suite): void {
  Object.assign(process.env, suiteEnvironment(suite));
}

// Throws unless this process has one suite's settings, so no test runs
// against the development database or sends real email.
function checkSuiteEnvironment(): void {
  const { DATABASE_URL, EMAIL_TRANSPORT } = process.env;
  const suites: readonly Suite[] = ["server", "system"];
  const ours = suites.some(
    (suite) => localDatabase(suite).url === DATABASE_URL,
  );
  if (!ours || EMAIL_TRANSPORT !== "outbox") {
    throw new Error(
      "These tests run only with their suite's settings: run them through mise run //apps/web:test:server or test:system.",
    );
  }
}

export type { Suite };
export { applySuiteEnvironment, checkSuiteEnvironment, suiteEnvironment };
