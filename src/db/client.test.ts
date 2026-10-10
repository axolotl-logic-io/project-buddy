import { afterEach, describe, expect, test, vi } from "vitest";
import { FAKE_DATABASE_URL } from "@/db/fake-neon-http.ts";

const NOT_SET = /DATABASE_URL is not set/u;

describe("getDb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await import("@/db/client.ts");

    expect(() => getDb()).toThrow(NOT_SET);
  });

  test("returns the same client on every call", async () => {
    vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
    const { getDb } = await import("@/db/client.ts");

    expect(getDb()).toBe(getDb());
  });
});
