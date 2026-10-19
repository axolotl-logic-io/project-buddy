// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

vi.mock("../../../scripts/test-db/test-database.ts", () => ({
  checkTestEnvironment: vi.fn(),
}));
const PORT = 32_475;
const OTHER_PORT = 32_476;

afterEach(() => {
  vi.unstubAllEnvs();
});

test("Playwright waits for its own bound Next process, never URL health", async () => {
  vi.stubEnv("E2E_PORT", `${PORT}`);
  vi.stubEnv("EMAIL_TRANSPORT", "outbox");
  vi.stubEnv("EMAIL_FROM_ADDRESS", "sender@example.test");
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
  expect(webServer.command).toContain(
    "check:build-fonts && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-db/run.ts --release-port && npm run start",
  );
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
