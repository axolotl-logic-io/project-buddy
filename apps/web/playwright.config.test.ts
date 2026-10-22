// @vitest-environment node
import type { PlaywrightTestConfig } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SHOT_DEVICES } from "./e2e/visual/shot-devices.ts";
import type { TestDatabase } from "./scripts/test-db/test-database.ts";

interface PlaywrightStub {
  defineConfig: (config: PlaywrightTestConfig) => PlaywrightTestConfig;
  devices: Readonly<Record<string, object>>;
}

// Playwright and the guard's database driver are too slow to load within a
// test's time limit (#359). The config reads only these from Playwright, and
// the guard has its own tests.
vi.mock(
  "@playwright/test",
  (): PlaywrightStub => ({
    defineConfig: (config: PlaywrightTestConfig): PlaywrightTestConfig =>
      config,
    devices: { "Desktop Chrome": {}, "iPhone 15": {}, "Pixel 7": {} },
  }),
);
const TEST_DATABASE = vi.hoisted(
  (): TestDatabase => ({
    url: "postgres://localhost:4444/project_buddy_e2e",
    name: "project_buddy_e2e",
  }),
);
vi.mock(
  "./scripts/test-db/test-database.ts",
  (): { checkTestEnvironment: () => TestDatabase } => ({
    checkTestEnvironment: (): TestDatabase => TEST_DATABASE,
  }),
);

// The config reads the environment when it loads, so each test stubs it,
// then loads a fresh copy.
async function loadConfig(): Promise<PlaywrightTestConfig> {
  vi.resetModules();
  const config = await import("./playwright.config.ts");
  return config.default;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", TEST_DATABASE.url);
  vi.stubEnv("E2E_PORT", "20010");
  vi.stubEnv("TUTOR_MODEL", "mock");
  vi.stubEnv("EMAIL_TRANSPORT", "outbox");
  vi.stubEnv("EMAIL_OUTBOX_DIR", "test-results/email-outbox");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("e2e projects", () => {
  // e2e-visual-and-auth-only: the auth tests in one project, which skips
  // the screenshots and filters out no test by its title, and the
  // screenshots in the others, one per device among them, with nothing held
  // back for a later project.
  test("run the auth tests apart from the screenshots, each with the others", async () => {
    const projects = (await loadConfig()).projects ?? [];
    const authProjects = projects.filter(
      ({ testIgnore }) => testIgnore !== undefined,
    );

    expect(authProjects).toHaveLength(1);
    expect(authProjects[0]?.grep).toBeUndefined();
    expect(authProjects[0]?.grepInvert).toBeUndefined();
    expect(projects.length).toBeGreaterThan(SHOT_DEVICES.length);
    for (const device of SHOT_DEVICES) {
      expect(
        projects.some(({ name }) => name?.endsWith(device.name) === true),
      ).toBe(true);
    }
    for (const project of projects) {
      expect(project.dependencies).toBeUndefined();
    }
  });
});

describe("the e2e web server", () => {
  test.each(["20010", "23990", "32475"])(
    "uses supplied port %s for the browser and server",
    async (port: string) => {
      vi.stubEnv("E2E_PORT", port);

      const config = await loadConfig();
      const servers = [config.webServer ?? []].flat();

      expect(config.use?.baseURL).toBe(`http://localhost:${port}`);
      expect(servers).toHaveLength(1);
      expect(servers[0]?.command).toBe(
        `npm run build && npm run check:build-fonts && npm run start -- --port ${port}`,
      );
    },
  );

  test.each([undefined, ""])(
    "refuses a missing or blank supplied port (%s)",
    async (port: string | undefined) => {
      vi.stubEnv("E2E_PORT", port);

      await expect(loadConfig()).rejects.toThrow(
        "E2E_PORT is not set. Configure it in the supplied .env.test.",
      );
    },
  );

  // Next.js would otherwise fall back to .env.local's EMAIL_FROM_ADDRESS.
  test("send from the address the runner expects", async () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", undefined);

    const servers = [(await loadConfig()).webServer ?? []].flat();

    expect(servers).toHaveLength(1);
    for (const server of servers) {
      expect(server.env).toHaveProperty(
        "EMAIL_FROM_ADDRESS",
        "hippy@example.test",
      );
    }
  });
});
