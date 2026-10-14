// End-to-end tests. Run them with `npm run test:e2e`, which resets the test
// database and loads .env.test, so the runner and the web server it starts
// share one test environment: the local test database, the test invite
// code, the session secret, the email outbox and the mock tutor model.
// Tests of signing up and signing in use the site's own pages and follow
// the sign-in link in the email, which e2e/outbox.ts reads from the outbox;
// other tests start signed in, with the session cookie e2e/log-in.ts makes.
// The `visual` projects compare screenshots with the baselines in
// e2e/visual/; `npm run test:visual:update` rewrites the ones that differ.
import {
  defineConfig,
  devices,
  type PlaywrightTestProject,
} from "@playwright/test";
import {
  storageDownEnvironment,
  storageDownPort,
} from "./e2e/storage-down-server.ts";
import {
  ANY_DEVICE_TAG,
  SHOT_DEVICES,
  type ShotDevice,
  shotDeviceGrep,
} from "./e2e/visual/shot-devices.ts";
import { WHOLE_DATABASE_TAG } from "./e2e/whole-database.ts";
import { checkTestEnvironment } from "./scripts/test-db/test-database.ts";
import { isContinuousIntegration, readEndToEndPort } from "./src/env.ts";

const SERVER_START_TIMEOUT_MS = 180_000;

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
  // 80% of the cores, 8 on a 10-core laptop: a full `npm run test:e2e` took
  // 69 s instead of 80 s with the default 5, and 73 s with 10 (issue #20,
  // the wiki's decision `e2e-test-database-speed`). `-- --workers N` overrides it.
  workers: "80%",
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
const testDatabase = checkTestEnvironment();

const run = runSettings();
const port = readEndToEndPort();
const baseUrl = `http://localhost:${port}`;
const wholeDatabaseTests = new RegExp(WHOLE_DATABASE_TAG, "u");
const VISUAL_TEST_DIR = "./e2e/visual";
const visualTests = "**/e2e/visual/**";
const VISUAL_NOISE_PIXELS = 10;
const VISUAL_PROJECT = "visual";

// What every visual project shares. Visual tests run beside each other and
// beside the chromium tests: each test has its own account and client
// address (e2e/fixtures.ts), so a page shows only that account's data, and
// no visual test writes anything that other tests read, such as the manual's
// sections.
const VISUAL_SETTINGS: PlaywrightTestProject = {
  testDir: VISUAL_TEST_DIR,
  // One baseline per page, theme, mode and screen, and per platform,
  // because fonts render differently on each: `-darwin` for macOS.
  snapshotPathTemplate:
    "{testDir}/{testFileName}-snapshots/{arg}-{platform}{ext}",
  // Any change of colour counts (threshold 0), so a small change to one
  // token fails. Up to VISUAL_NOISE_PIXELS pixels may differ: three runs
  // measured at most 4 (the alert icon after a wrong invite code).
  expect: {
    toHaveScreenshot: { maxDiffPixels: VISUAL_NOISE_PIXELS, threshold: 0 },
  },
};

function deviceProjectName(device: ShotDevice): string {
  return `${VISUAL_PROJECT}-${device.name}`;
}

// A project per device in SHOT_DEVICES, running only that device's shots.
const DEVICE_PROJECTS: PlaywrightTestProject[] = SHOT_DEVICES.map((device) => ({
  ...VISUAL_SETTINGS,
  name: deviceProjectName(device),
  use: { ...device.descriptor },
  grep: shotDeviceGrep(device),
}));

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
      grepInvert: wholeDatabaseTests,
      testIgnore: visualTests,
    },
    // Screenshots of every page, compared with the baselines beside the
    // specs: in Desktop Chrome at a laptop's and a phone's width, and on
    // each of SHOT_DEVICES. `npm run test:visual` runs them alone.
    {
      ...VISUAL_SETTINGS,
      name: VISUAL_PROJECT,
      use: { ...devices["Desktop Chrome"] },
      grepInvert: ANY_DEVICE_TAG,
    },
    ...DEVICE_PROJECTS,
    // Tests tagged WHOLE_DATABASE_TAG, one at a time, once every other test
    // has finished. Playwright skips them if any other test fails.
    {
      name: "whole-database",
      use: { ...devices["Desktop Chrome"] },
      grep: wholeDatabaseTests,
      testIgnore: visualTests,
      dependencies: [
        "chromium",
        VISUAL_PROJECT,
        ...SHOT_DEVICES.map(deviceProjectName),
      ],
      workers: 1,
    },
  ],
  webServer: [
    {
      command: `npm run build && npm run start -- --port ${port}`,
      url: baseUrl,
      // A server already on the port may not be using the test environment.
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
    },
    // The same build with its database unreachable (storage-down-server.ts).
    // Playwright starts web servers one after another, so the build above
    // has finished before this one starts.
    {
      command: `npm run start -- --port ${storageDownPort()}`,
      url: `http://localhost:${storageDownPort()}`,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      env: storageDownEnvironment(testDatabase.url),
    },
  ],
});
