// Playwright consumes the orchestrator-provided (or manually copied) .env.test.
// test:playwright runs selected files alone; test:e2e runs server tests first.
import { defineConfig, devices } from "@playwright/test";
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
  retries: number;
  reporter: "github" | "list";
  workers: string;
}

const CI_RUN: RunSettings = {
  forbidOnly: true,
  retries: 2,
  reporter: "github",
  // Playwright's default, half the cores: more is unmeasured on CI's runners.
  workers: "50%",
};

const LOCAL_RUN: RunSettings = {
  forbidOnly: false,
  retries: 0,
  reporter: "list",
  // Playwright's default, half the cores. `-- --workers N` overrides it.
  workers: "50%",
};

function runSettings(): RunSettings {
  if (isContinuousIntegration()) {
    return CI_RUN;
  }
  return LOCAL_RUN;
}

// The web server inherits the runner's environment, and Next.js falls back to
// .env.local and .env for anything missing, which hold the production
// DATABASE_URL and no BUDDY_MODEL, which means Claude. So the run stops here,
// before the server starts, unless DATABASE_URL names the local test database
// and BUDDY_MODEL is "mock".
checkTestEnvironment();

// The sender the runner expects on every email (e2e/sign-in.spec.ts), given
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
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: run.forbidOnly,
  retries: run.retries,
  reporter: run.reporter,
  workers: run.workers,
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
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
