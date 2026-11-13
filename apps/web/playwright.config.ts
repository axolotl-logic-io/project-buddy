// Playwright consumes the orchestrator-provided (or manually copied) .env.test.
// test:playwright runs selected files alone; test:e2e runs server tests first.
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
  // which the Full suite workflow uploads when the run fails.
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
const baseUrl = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./test/system",
  fullyParallel: true,
  forbidOnly: run.forbidOnly,
  // No run retries a failed test, in CI or locally: a test that passes only
  // on a retry is a flake, and a flake is a failure (flakes-are-failures).
  retries: 0,
  reporter: run.reporter,
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
  webServer: {
    command: `npm run build && npm run check:build-fonts && npm run start -- --port ${port}`,
    wait: { stdout: OWN_SERVER_LISTENING },
    // Never use URL health as readiness: this process must bind successfully.
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
    env: serverEmailEnvironment,
  },
});
