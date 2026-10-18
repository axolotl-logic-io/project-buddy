import { describe, expect, test } from "vitest";

// src/ holds only what the site runs: tests and the code only they use live
// in test/, in the folder their subject has under src/ (#474).
const TEST_FILES = Object.keys(
  import.meta.glob([
    "/src/**/*.{test,spec}.{ts,tsx,mts}",
    "/src/**/__snapshots__/**",
  ]),
);
const TEST_HELPERS = Object.keys(
  import.meta.glob([
    "/src/**/fake-*.{ts,tsx}",
    "/src/**/*-fixtures.{ts,tsx}",
    "/src/**/*-test-kit.{ts,tsx}",
  ]),
);

describe("src/", () => {
  test("holds no test file", () => {
    expect(TEST_FILES).toStrictEqual([]);
  });

  test("holds no test helper", () => {
    expect(TEST_HELPERS).toStrictEqual([]);
  });
});
