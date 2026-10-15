// @vitest-environment node
import type { PlaywrightTestConfig } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// The config reads the environment when it loads, so each test stubs it,
// then loads a fresh copy.
async function loadConfig(): Promise<PlaywrightTestConfig> {
  vi.resetModules();
  const config = await import("./playwright.config.ts");
  return config.default;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://localhost:4444/project_buddy_e2e");
  vi.stubEnv("TUTOR_MODEL", "mock");
  vi.stubEnv("EMAIL_TRANSPORT", "outbox");
  vi.stubEnv("EMAIL_OUTBOX_DIR", "test-results/email-outbox");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("e2e workers", () => {
  test("a local run uses 80% of the cores", async () => {
    vi.stubEnv("CI", undefined);

    expect((await loadConfig()).workers).toBe("80%");
  });

  test("a CI run keeps Playwright's default, half the cores", async () => {
    vi.stubEnv("CI", "true");

    expect((await loadConfig()).workers).toBe("50%");
  });
});

describe("e2e web servers", () => {
  // Next.js would otherwise fall back to .env.local's EMAIL_FROM_ADDRESS.
  test("send from the address the runner expects", async () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", undefined);

    const servers = [(await loadConfig()).webServer ?? []].flat();

    expect(servers).toHaveLength(2);
    for (const server of servers) {
      expect(server.env).toHaveProperty(
        "EMAIL_FROM_ADDRESS",
        "hippy@example.test",
      );
    }
  });
});
