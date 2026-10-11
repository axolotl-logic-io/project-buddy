// End-to-end tests. Run them with `npm run test:e2e`, which resets the test
// database and loads .env.test, so the runner and the web server it starts
// share one test environment: the local test database, a test passphrase and
// the mock tutor model.
import { defineConfig, devices } from "@playwright/test";
import { checkTestEnvironment } from "./scripts/test-db/test-database.ts";
import { isContinuousIntegration, readEndToEndPort } from "./src/env.ts";

const SERVER_START_TIMEOUT_MS = 180_000;

interface RunSettings {
  forbidOnly: boolean;
  retries: number;
  reporter: "github" | "list";
}

const CI_RUN: RunSettings = {
  forbidOnly: true,
  retries: 2,
  reporter: "github",
};

const LOCAL_RUN: RunSettings = {
  forbidOnly: false,
  retries: 0,
  reporter: "list",
};

function runSettings(): RunSettings {
  if (isContinuousIntegration()) {
    return CI_RUN;
  }
  return LOCAL_RUN;
}

// The web server inherits the runner's environment, and Next.js falls back to
// .env.local and .env for anything missing, which hold the production
// DATABASE_URL and no TUTOR_MODEL, which means Claude. So the run stops here,
// before the server starts, unless DATABASE_URL names the local test database
// and TUTOR_MODEL is "mock".
checkTestEnvironment();

const run = runSettings();
const port = readEndToEndPort();
const baseUrl = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: run.forbidOnly,
  retries: run.retries,
  reporter: run.reporter,
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
    command: `npm run build && npm run start -- --port ${port}`,
    url: baseUrl,
    // A server already on the port may not be using the test environment.
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
  },
});
