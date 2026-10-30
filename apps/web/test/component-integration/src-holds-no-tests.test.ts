import { describe, expect, test } from "vitest";

// src/ holds only what the site runs: tests and the code only they use live
// in test/<level>/, under the path their subject has (#474). So no test file
// sits in src/, or anywhere else outside the ISTQB level folders (#541).
const TEST_FILES = Object.keys(
  import.meta.glob([
    "/**/*.{test,spec}.{ts,tsx,mts,sh}",
    "!/node_modules/**",
    "!/test/{component,component-integration,system,system-integration,acceptance}/**",
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
