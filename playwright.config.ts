import { defineConfig } from "@playwright/test";
import { isContinuousIntegration } from "./src/env.ts";

const BASE_URL = "http://localhost:3000";
const SERVER_START_TIMEOUT_MS = 180_000;
// Option and variable names that Playwright and the app define.
const BASE_URL_OPTION = "baseURL";
const SESSION_SECRET_VARIABLE = "SESSION_SECRET";

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
    [BASE_URL_OPTION]: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // Playwright's defaults match a desktop Chrome: a 1280x720 viewport,
      // no touch and a scale factor of 1.
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: run.reuseExistingServer,
    timeout: SERVER_START_TIMEOUT_MS,
    // The proxy needs a secret to check sessions. The specs never log in, so a
    // placeholder works and no database is needed.
    env: { [SESSION_SECRET_VARIABLE]: "e2e-session-secret" },
  },
});
