import { afterEach, describe, expect, it, vi } from "vitest";

describe("getDb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await import("@/db/client");

    expect(() => getDb()).toThrow(/DATABASE_URL is not set/);
  });

  it("returns the same client on every call", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://user:pass@example.neon.tech/db?sslmode=require",
    );
    const { getDb } = await import("@/db/client");

    expect(getDb()).toBe(getDb());
  });
});
