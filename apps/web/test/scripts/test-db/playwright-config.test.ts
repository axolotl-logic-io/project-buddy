// @vitest-environment node
import { devices } from "@playwright/test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("../../../scripts/test-db/test-database.ts", () => ({
  checkTestEnvironment: vi.fn(),
}));
const PORT = 32_475;
const OTHER_PORT = 32_476;

beforeEach(() => {
  vi.stubEnv("E2E_PORT", `${PORT}`);
  vi.stubEnv("EMAIL_TRANSPORT", "outbox");
  vi.stubEnv("EMAIL_FROM_ADDRESS", "sender@example.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("Playwright waits for its own bound Next process, never URL health", async () => {
  const { default: config } = await import("../../../playwright.config.ts");
  const { webServer } = config;
  expect(Array.isArray(webServer)).toBe(false);
  if (
    webServer === undefined ||
    webServer === null ||
    Array.isArray(webServer)
  ) {
    throw new Error("One owned test server is required.");
  }
  expect(webServer.url).toBeUndefined();
  expect(webServer.port).toBeUndefined();
  expect(webServer.reuseExistingServer).toBe(false);
  expect(webServer.command).toContain("check:build-fonts && npm run start");
  expect(webServer.command).toContain(`--port ${PORT}`);
  expect(webServer.command).not.toContain("--release-port");
  const readiness = webServer.wait?.stdout;
  expect(readiness).toBeDefined();
  expect(readiness?.test("Ready in 50ms")).toBe(false);
  expect(
    readiness?.test(`- Local: http://localhost:${OTHER_PORT}\nReady in 50ms`),
  ).toBe(false);
  expect(
    readiness?.test(
      `- Local: http://localhost:${PORT}\n- Network: http://192.0.2.1:${PORT}\n✓ Ready in 50ms`,
    ),
  ).toBe(true);
});

// Keep Chromium's screenshot measurement deterministic without changing the
// browser/device emulation or the normal auth and WebKit rendering paths.
test.each([
  {
    name: "visual",
    expected: {
      ...devices["Desktop Chrome"],
      launchOptions: { args: ["--disable-partial-raster"] },
    },
  },
  {
    name: "visual-pixel-7",
    expected: {
      ...devices["Pixel 7"],
      launchOptions: { args: ["--disable-partial-raster"] },
    },
  },
  { name: "visual-iphone-15", expected: devices["iPhone 15"] },
  { name: "chromium", expected: devices["Desktop Chrome"] },
])(
  "$name preserves its device and rasterization policy",
  async ({ name, expected }) => {
    const { default: config } = await import("../../../playwright.config.ts");
    const project = config.projects?.find(
      (candidate) => candidate.name === name,
    );
    expect(project, `configured project ${name}`).toBeDefined();
    expect(project?.use).toEqual(expected);
  },
);
