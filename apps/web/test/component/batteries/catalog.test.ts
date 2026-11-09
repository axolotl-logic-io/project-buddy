import { afterEach, expect, test, vi } from "vitest";
import { batteryCatalog } from "@/batteries/catalog.ts";
import { readBatteryPayments } from "@/env.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("purchases are disabled without test configuration", () => {
  vi.stubEnv("STRIPE_TEST_SECRET_KEY", "");
  expect(batteryCatalog()).toEqual([]);
});

test("live keys and production deployments cannot enable payments", () => {
  vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_live_fixture");
  expect(() => readBatteryPayments()).toThrow();
  vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("VERCEL_ENV", "production");
  expect(() => readBatteryPayments()).toThrow();
});

test("partial configuration and malformed catalogs fail closed", () => {
  vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_TEST_WEBHOOK_SECRET", "");
  expect(() => batteryCatalog()).toThrow();
  vi.stubEnv("STRIPE_TEST_WEBHOOK_SECRET", "whsec_fixture");
  vi.stubEnv("BATTERY_TEST_CATALOG", '[{"id":"test","batteries":-1}]');
  expect(() => batteryCatalog()).toThrow();
});

test("Stripe test payments cannot credit the shared remote database", () => {
  vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("DATABASE_URL", "postgresql://remote.invalid/example");
  expect(() => readBatteryPayments()).toThrow("isolated local database");
});
