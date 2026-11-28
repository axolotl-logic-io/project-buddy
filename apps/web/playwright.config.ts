// Playwright consumes the orchestrator-provided (or manually copied) .env.test.
// npm test runs these tests after the server tests and a fresh database reset.
// Pass a file to npm run test:system to run only that file.
import {
  defineConfig,
  devices,
  type ReporterDescription,
} from "@playwright/test";
import { checkTestEnvironment } from "./scripts/test-db/test-database.ts";
import {
  emailFromAddressEnvironment,
  isContinuousIntegration,
  readEmailFromAddress,
  readEndToEndPort,
} from "./src/env.ts";
import { fakeZoteroClientEnvironment } from "./test/support/zotero/fake-zotero-client.ts";

const SERVER_START_TIMEOUT_MS = 180_000;
// Next emits this only after its own listening event. URL health alone could
// accept an unrelated process that won the release/bind interval.

interface RunSettings {
  forbidOnly: boolean;
  reporter: ReporterDescription[];
  trace: "retain-on-failure" | "on-first-retry";
  workers: string;
}

const CI_RUN: RunSettings = {
  forbidOnly: true,
  // Annotations on the PR, and an HTML report with each failure's trace,
  // which the CI workflow uploads when the run fails.
  reporter: [["github"], ["html", { open: "never" }]],
  trace: "retain-on-failure",
  // Playwright's default, half the cores: more is unmeasured on CI's runners.
  workers: "50%",
};

const LOCAL_RUN: RunSettings = {
  forbidOnly: false,
  reporter: [["list"]],
  // `-- --retries 1` records a trace of a failing test's retry.
  trace: "on-first-retry",
  // Playwright's default, half the cores. `-- --workers N` overrides it.
  workers: "50%",
};

function runSettings(): RunSettings {
  if (isContinuousIntegration()) {
    return CI_RUN;
  }
  return LOCAL_RUN;
}

// Require an isolated local test database and email outbox before starting.
checkTestEnvironment();

// The sender the runner expects on every email (test/system/sign-in.spec.ts), given
// to the web server too, so it doesn't take .env.local's real one instead.
const serverEmailEnvironment = emailFromAddressEnvironment(
  readEmailFromAddress(),
);

const run = runSettings();
const port = readEndToEndPort();
const OWN_SERVER_LISTENING = new RegExp(
  `Local:\\s+http://localhost:${port}\\s[\\s\\S]*Ready in `,
  "u",
);
const FAKE_ZOTERO_LISTENING =
  /ZOTERO_API_ORIGIN=(?<zotero_api_origin>\S+) ZOTERO_OAUTH_ORIGIN=(?<zotero_oauth_origin>\S+)/u;
const baseUrl = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./test/system",
  fullyParallel: true,
  forbidOnly: run.forbidOnly,
  // No run retries a failed test, in CI or locally: a test that passes only
  // on a retry is a flake, and a flake is a failure (flakes-are-failures).
  retries: 0,
  reporter: [...run.reporter, ["./scripts/test-env/playwright-failures.ts"]],
  workers: run.workers,
  use: {
    baseURL: baseUrl,
    trace: run.trace,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    // The fake Zotero (test/support/zotero/fake-zotero.ts) starts first.
    // Playwright copies its origin from the line it prints into
    // ZOTERO_API_ORIGIN and ZOTERO_OAUTH_ORIGIN, which the site's server
    // below and the tests then read.
    {
      command:
        "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON test/support/zotero/serve-fake-zotero.ts",
      wait: { stdout: FAKE_ZOTERO_LISTENING },
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
    },
    {
      command: `bash scripts/test-env/start-system-server.sh ${port}`,
      wait: { stdout: OWN_SERVER_LISTENING },
      // Never use URL health as readiness: this process must bind successfully.
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      env: {
        ...serverEmailEnvironment,
        ...fakeZoteroClientEnvironment(),
      },
    },
  ],
});
