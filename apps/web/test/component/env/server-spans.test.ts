import { afterEach, expect, test, vi } from "vitest";
import { readServerSpans } from "@/env.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

function localSettings(): void {
  vi.stubEnv("PERF_SERVER_SPANS", "local");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/pb_wt_span_tests");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "");
}

test("span collection is off by default without requiring a database", () => {
  vi.stubEnv("PERF_SERVER_SPANS", "");
  vi.stubEnv("DATABASE_URL", "");
  expect(readServerSpans()).toBe(false);
});

test("only the explicit local mode enables collection", () => {
  localSettings();
  expect(readServerSpans()).toBe(true);
  vi.stubEnv("PERF_SERVER_SPANS", "true");
  expect(readServerSpans).toThrow('must be unset or "local"');
});

test("hosted deployment and shared database settings refuse collection", () => {
  localSettings();
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(readServerSpans).toThrow("isolated local");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "1");
  expect(readServerSpans).toThrow("isolated local");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("DATABASE_URL", "postgresql://example.test/pb_wt_span_tests");
  expect(readServerSpans).toThrow("isolated local");
  vi.stubEnv("DATABASE_URL", "postgresql://127.0.0.1:5432/shared");
  expect(readServerSpans).toThrow("isolated local");
});
