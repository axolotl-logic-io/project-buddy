import { afterEach, describe, expect, test, vi } from "vitest";
import {
  isContinuousIntegration,
  readAnthropicApiKeyIfSet,
  readDatabaseUrl,
  readDatabaseUrlForTooling,
  readSessionSecret,
  readSitePassphrase,
  readTutorModel,
} from "@/env.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each([
  ["DATABASE_URL", readDatabaseUrl],
  ["SESSION_SECRET", readSessionSecret],
  ["SITE_PASSPHRASE", readSitePassphrase],
])("%s", (name, read) => {
  test("is returned trimmed when set", () => {
    vi.stubEnv(name, "  value  ");

    expect(read()).toBe("value");
  });

  test("throws a descriptive error when missing or blank", () => {
    vi.stubEnv(name, undefined);
    expect(() => read()).toThrow(`${name} is not set`);
    vi.stubEnv(name, " ");
    expect(() => read()).toThrow(`${name} is not set`);
  });
});

describe("DATABASE_URL for drizzle-kit, which may be missing", () => {
  test("is returned trimmed when set", () => {
    vi.stubEnv("DATABASE_URL", " postgresql://example ");

    expect(readDatabaseUrlForTooling()).toBe("postgresql://example");
  });

  test("is empty when missing or blank", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(readDatabaseUrlForTooling()).toBe("");
    vi.stubEnv("DATABASE_URL", "  ");
    expect(readDatabaseUrlForTooling()).toBe("");
  });
});

describe("ANTHROPIC_API_KEY", () => {
  test("is returned trimmed when set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", " sk-ant-test ");

    expect(readAnthropicApiKeyIfSet()).toBe("sk-ant-test");
  });

  test("is undefined when missing or blank", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);
    expect(readAnthropicApiKeyIfSet()).toBeUndefined();
    vi.stubEnv("ANTHROPIC_API_KEY", " ");
    expect(readAnthropicApiKeyIfSet()).toBeUndefined();
  });
});

describe("TUTOR_MODEL", () => {
  test("selects Claude when missing or blank", () => {
    vi.stubEnv("TUTOR_MODEL", undefined);
    expect(readTutorModel()).toBe("claude");
    vi.stubEnv("TUTOR_MODEL", " ");
    expect(readTutorModel()).toBe("claude");
  });

  test("selects the mock model when set to mock", () => {
    vi.stubEnv("TUTOR_MODEL", " mock ");

    expect(readTutorModel()).toBe("mock");
  });

  test("throws a descriptive error for any other value", () => {
    vi.stubEnv("TUTOR_MODEL", "gpt");

    expect(() => readTutorModel()).toThrow(
      'TUTOR_MODEL must be unset, "claude" or "mock"',
    );
  });
});

describe("isContinuousIntegration", () => {
  test("is true only when CI is set to a non-empty value", () => {
    vi.stubEnv("CI", "true");
    expect(isContinuousIntegration()).toBe(true);
    vi.stubEnv("CI", "");
    expect(isContinuousIntegration()).toBe(false);
    vi.stubEnv("CI", undefined);
    expect(isContinuousIntegration()).toBe(false);
  });
});
