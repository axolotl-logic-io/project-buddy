import { describe, expect, test } from "vitest";

// Every source file under src/ and test/ but the Playwright specs in
// test/system/, by path relative to src/quota/ and
// test/component-integration/quota/; each test level mirrors src/'s folders,
// so no two paths clash.
const PRODUCTION_SOURCES = import.meta.glob<string>(
  ["../**/*.ts", "../**/*.tsx"],
  {
    base: "/src/quota",
    query: "?raw",
    import: "default",
    eager: true,
  },
);
const TEST_SOURCES = import.meta.glob<string>(
  ["../../**/*.ts", "../../**/*.tsx", "!../../system/**"],
  {
    base: "/test/component-integration/quota",
    query: "?raw",
    import: "default",
    eager: true,
  },
);
const SOURCES: Readonly<Record<string, string>> = {
  ...PRODUCTION_SOURCES,
  ...TEST_SOURCES,
};

// The modules that may make a grant: the quota check, its stand-in for dependency-backed
// tests, and this test.
const GRANTERS = new Set(["./quota.ts", "./quota-grant.test.ts"]);

const NAMES_GRANT_MODULE = /quota-grant(?:\.ts)?["']/u;

// A test helper, which may hand out grants, so only tests may name one:
// quota-test-kit.ts directly, or another test kit that wraps it.
const NAMES_TEST_KIT = /-test-kit(?:\.tsx?)?["']/u;

// A type assertion to QuotaGrant (`as QuotaGrant`, `as unknown as
// QuotaGrant` or `<QuotaGrant>x`), which would make a grant without the check.
const CASTS_TO_GRANT = /\bas\s+QuotaGrant\b|(?<![\w$])<QuotaGrant>/u;
const IS_TEST = /\.test\.tsx?$/u;

describe("grantQuota", () => {
  test("is imported only by the quota check, so no other caller skips it", () => {
    const importers = Object.entries(SOURCES)
      .filter(([, source]) => NAMES_GRANT_MODULE.test(source))
      .map(([path]) => path.replace("../quota/", "./"));

    expect(importers).toContain("./quota.ts");
    expect(importers.filter((path) => !GRANTERS.has(path))).toEqual([]);
  });

  test("production code imports no test kits", () => {
    const productionKitImporters = Object.entries(PRODUCTION_SOURCES)
      .filter(([, source]) => NAMES_TEST_KIT.test(source))
      .map(([path]) => path);
    expect(
      Object.values(TEST_SOURCES).some((source) => NAMES_TEST_KIT.test(source)),
    ).toBe(true);
    expect(productionKitImporters).toEqual([]);
  });

  test("is never made by a type cast outside tests", () => {
    const casters = Object.entries(SOURCES)
      .filter(
        ([path, source]) => !IS_TEST.test(path) && CASTS_TO_GRANT.test(source),
      )
      .map(([path]) => path);

    expect(casters).toEqual([]);
  });
});
