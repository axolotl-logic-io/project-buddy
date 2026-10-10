import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isContinuousIntegration,
  readDatabaseUrl,
  readDatabaseUrlIfSet,
  readSessionSecret,
  readSitePassphrase,
} from "@/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each([
  ["DATABASE_URL", readDatabaseUrl],
  ["SESSION_SECRET", readSessionSecret],
  ["SITE_PASSPHRASE", readSitePassphrase],
])("%s", (name, read) => {
  it("is returned trimmed when set", () => {
    vi.stubEnv(name, "  value  ");

    expect(read()).toBe("value");
  });

  it("throws a descriptive error when missing or blank", () => {
    vi.stubEnv(name, undefined);
    expect(() => read()).toThrow(`${name} is not set`);
    vi.stubEnv(name, " ");
    expect(() => read()).toThrow(`${name} is not set`);
  });
});

describe("readDatabaseUrlIfSet", () => {
  it("returns DATABASE_URL, or undefined when it is missing", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://example");
    expect(readDatabaseUrlIfSet()).toBe("postgresql://example");
    vi.stubEnv("DATABASE_URL", undefined);
    expect(readDatabaseUrlIfSet()).toBeUndefined();
  });
});

describe("isContinuousIntegration", () => {
  it("is true only when CI is set to a non-empty value", () => {
    vi.stubEnv("CI", "true");
    expect(isContinuousIntegration()).toBe(true);
    vi.stubEnv("CI", "");
    expect(isContinuousIntegration()).toBe(false);
    vi.stubEnv("CI", undefined);
    expect(isContinuousIntegration()).toBe(false);
  });
});
