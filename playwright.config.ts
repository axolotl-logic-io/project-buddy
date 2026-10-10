import { defineConfig, devices } from "@playwright/test";
import { isContinuousIntegration } from "./src/env.ts";

const BASE_URL = "http://localhost:3000";
const SERVER_START_TIMEOUT_MS = 180_000;

interface RunSettings {
  forbidOnly: boolean;
  retries: number;
  reporter: "github" | "list";
  reuseExistingServer: boolean;
}

const CI_RUN: RunSettings = {
  forbidOnly: true,
  retries: 2,
  reporter: "github",
  reuseExistingServer: false,
};

const LOCAL_RUN: RunSettings = {
  forbidOnly: false,
  retries: 0,
  reporter: "list",
  reuseExistingServer: true,
};

function runSettings(): RunSettings {
  if (isContinuousIntegration()) {
    return CI_RUN;
  }
  return LOCAL_RUN;
}

const run = runSettings();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: run.forbidOnly,
  retries: run.retries,
  reporter: run.reporter,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: run.reuseExistingServer,
    timeout: SERVER_START_TIMEOUT_MS,
    // The proxy needs a secret to check sessions. The specs never log in, so a
    // placeholder works and no database is needed.
    env: { SESSION_SECRET: "e2e-session-secret" },
  },
});
