import { afterEach, describe, expect, test, vi } from "vitest";
import {
  isContinuousIntegration,
  readAnthropicApiKeyIfSet,
  readDatabaseUrl,
  readDatabaseUrlForTooling,
  readEmailFromAddress,
  readEmailOutboxDir,
  readEmailTransport,
  readEndToEndPort,
  readProductionOrigin,
  readResendApiKey,
  readSessionSecret,
  readTestDatabaseUrl,
  readTutorModel,
} from "@/env.ts";

const CHOSEN_PORT = 3200;
const FROM_ADDRESS_NOT_SET = /EMAIL_FROM_ADDRESS is not set/u;
const TEST_DATABASE_URL_NOT_SET = /DATABASE_URL is not set.*\.env\.test/u;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each([
  ["DATABASE_URL", readDatabaseUrl],
  ["SESSION_SECRET", readSessionSecret],
  ["RESEND_API_KEY", readResendApiKey],
  ["EMAIL_OUTBOX_DIR", readEmailOutboxDir],
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

describe("DATABASE_URL for the test commands, from .env.test", () => {
  test("is returned trimmed when set", () => {
    vi.stubEnv("DATABASE_URL", " postgres://localhost:4444/e2e ");

    expect(readTestDatabaseUrl()).toBe("postgres://localhost:4444/e2e");
  });

  test("throws, pointing to .env.test, when missing or blank", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => readTestDatabaseUrl()).toThrow(TEST_DATABASE_URL_NOT_SET);
    vi.stubEnv("DATABASE_URL", " ");
    expect(() => readTestDatabaseUrl()).toThrow(TEST_DATABASE_URL_NOT_SET);
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

  test.each(["preview", "development", "test", undefined])(
    "selects the mock model off production with VERCEL_ENV=%s",
    (environment) => {
      vi.stubEnv("VERCEL_ENV", environment);
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("TUTOR_MODEL", " mock ");

      expect(readTutorModel()).toBe("mock");
    },
  );

  test.each(["production", " production "])(
    "refuses the mock with VERCEL_ENV=%s",
    (environment) => {
      vi.stubEnv("VERCEL_ENV", environment);
      vi.stubEnv("TUTOR_MODEL", " mock ");

      expect(() => readTutorModel()).toThrow(
        'TUTOR_MODEL is "mock" in production, where the tutor must use Claude.',
      );
    },
  );

  test.each([undefined, " ", " claude "])(
    "selects Claude in production with TUTOR_MODEL=%s",
    (model) => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("TUTOR_MODEL", model);

      expect(readTutorModel()).toBe("claude");
    },
  );

  test("throws a descriptive error for any other value", () => {
    vi.stubEnv("TUTOR_MODEL", "gpt");

    expect(() => readTutorModel()).toThrow(
      'TUTOR_MODEL must be unset, "claude" or "mock"',
    );
  });
});

describe("EMAIL_TRANSPORT", () => {
  test("selects Resend when missing or blank", () => {
    vi.stubEnv("EMAIL_TRANSPORT", undefined);
    expect(readEmailTransport()).toBe("resend");
    vi.stubEnv("EMAIL_TRANSPORT", " ");
    expect(readEmailTransport()).toBe("resend");
  });

  test("selects the outbox when set to outbox off production", () => {
    vi.stubEnv("EMAIL_TRANSPORT", " outbox ");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(readEmailTransport()).toBe("outbox");
    vi.stubEnv("VERCEL_ENV", undefined);
    expect(readEmailTransport()).toBe("outbox");
  });

  test("refuses the outbox in production", () => {
    vi.stubEnv("EMAIL_TRANSPORT", "outbox");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(() => readEmailTransport()).toThrow(
      'EMAIL_TRANSPORT is "outbox" in production',
    );
  });

  test("selects Resend in production", () => {
    vi.stubEnv("EMAIL_TRANSPORT", "resend");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(readEmailTransport()).toBe("resend");
  });

  test("throws a descriptive error for any other value", () => {
    vi.stubEnv("EMAIL_TRANSPORT", "smtp");

    expect(() => readEmailTransport()).toThrow(
      'EMAIL_TRANSPORT must be unset, "resend" or "outbox"',
    );
  });
});

describe("EMAIL_FROM_ADDRESS", () => {
  test("returns the trimmed address with either transport", () => {
    vi.stubEnv("EMAIL_FROM_ADDRESS", "  sender@example.test  ");
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("EMAIL_TRANSPORT", "resend");
    expect(readEmailFromAddress()).toBe("sender@example.test");
    vi.stubEnv("EMAIL_TRANSPORT", "outbox");
    expect(readEmailFromAddress()).toBe("sender@example.test");
  });

  test("throws a descriptive error when missing or blank with Resend", () => {
    for (const transport of [undefined, "resend"]) {
      vi.stubEnv("EMAIL_TRANSPORT", transport);
      vi.stubEnv("EMAIL_FROM_ADDRESS", undefined);
      expect(() => readEmailFromAddress()).toThrow(FROM_ADDRESS_NOT_SET);
      vi.stubEnv("EMAIL_FROM_ADDRESS", " ");
      expect(() => readEmailFromAddress()).toThrow(FROM_ADDRESS_NOT_SET);
    }
  });

  test("defaults to hippy@example.test with the outbox", () => {
    vi.stubEnv("EMAIL_TRANSPORT", "outbox");
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("EMAIL_FROM_ADDRESS", undefined);
    expect(readEmailFromAddress()).toBe("hippy@example.test");
    vi.stubEnv("EMAIL_FROM_ADDRESS", " ");
    expect(readEmailFromAddress()).toBe("hippy@example.test");
  });
});

describe("the production origin", () => {
  test("is the production domain Vercel names, over HTTPS", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", " buddy.example.com ");

    expect(readProductionOrigin()).toBe("https://buddy.example.com");
  });

  test("is undefined off Vercel", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
    expect(readProductionOrigin()).toBeUndefined();
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(readProductionOrigin()).toBeUndefined();
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

describe("the end-to-end port", () => {
  test("is the port set in E2E_PORT", () => {
    vi.stubEnv("E2E_PORT", ` ${CHOSEN_PORT} `);
    expect(readEndToEndPort()).toBe(CHOSEN_PORT);
  });

  test("refuses a missing or blank E2E_PORT rather than choosing a port", () => {
    vi.stubEnv("E2E_PORT", "");
    expect(readEndToEndPort).toThrow("E2E_PORT is not set");
    vi.stubEnv("E2E_PORT", undefined);
    expect(readEndToEndPort).toThrow("E2E_PORT is not set");
  });

  test("throws a descriptive error unless E2E_PORT is a port number", () => {
    for (const value of ["http", "0", "65536", "3100.5"]) {
      vi.stubEnv("E2E_PORT", value);
      expect(() => readEndToEndPort()).toThrow("E2E_PORT must be a port");
    }
  });
});
