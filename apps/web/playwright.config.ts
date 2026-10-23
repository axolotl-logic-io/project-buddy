// Playwright consumes the orchestrator-provided (or manually copied) .env.test.
// test:playwright runs selected files alone; test:e2e runs server tests first.
import {
  defineConfig,
  devices,
  type PlaywrightTestProject,
} from "@playwright/test";
import { BROWSER_SERVER } from "./browser-server.ts";
import {
  ANY_DEVICE_TAG,
  SHOT_DEVICES,
  type ShotDevice,
  shotDeviceGrep,
} from "./e2e/visual/shot-devices.ts";
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
  // 80% of the cores, 8 on a 10-core laptop: a full `npm run test:e2e` took
  // 69 s instead of 80 s with the default 5, and 73 s with 10 (issue #20,
  // decision `e2e-test-database-speed` in docs/Decisions-Code-and-tooling.md).
  // `-- --workers N` overrides it.
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
  // One baseline per page, theme, mode and screen. The browsers run in
  // Playwright's Linux image on every host (browser-server.ts), so one
  // baseline serves them all (`os-neutral-browsers`).
  snapshotPathTemplate: "{testDir}/{testFileName}-snapshots/{arg}{ext}",
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

// Chromium's partial rasterization can round the same fractional rounded
// borders to different colours after a clipped repaint (#506, macOS). Paint
// whole tiles for visual comparisons, including Chromium's emulated phones.
// WebKit and the non-visual auth project keep their normal rendering paths.
function visualBrowserUse(
  descriptor: (typeof devices)[string],
): NonNullable<PlaywrightTestProject["use"]> {
  if (descriptor.defaultBrowserType === "chromium") {
    return {
      ...descriptor,
      launchOptions: { args: ["--disable-partial-raster"] },
    };
  }
  return { ...descriptor };
}

// A project per device in SHOT_DEVICES, running only that device's shots.
const DEVICE_PROJECTS: PlaywrightTestProject[] = SHOT_DEVICES.map((device) => ({
  ...VISUAL_SETTINGS,
  name: deviceProjectName(device),
  use: visualBrowserUse(device.descriptor),
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
    // Every project's browser runs in the browser server, not on the host.
    connectOptions: BROWSER_SERVER,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: visualTests,
    },
    // Screenshots of every page, compared with the baselines beside the
    // specs: in Desktop Chrome at a laptop's and a phone's width, and on
    // each of SHOT_DEVICES. `npm run test:visual` runs them alone.
    {
      ...VISUAL_SETTINGS,
      name: VISUAL_PROJECT,
      use: visualBrowserUse(devices["Desktop Chrome"]),
      grepInvert: ANY_DEVICE_TAG,
    },
    ...DEVICE_PROJECTS,
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
