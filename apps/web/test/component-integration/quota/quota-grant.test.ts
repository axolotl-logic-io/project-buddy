import { describe, expect, test } from "vitest";

// Every source file under src/ and test/ but the Playwright specs in
// test/system/, by path relative to src/quota/ and
// test/component-integration/quota/; each test level mirrors src/'s folders,
// so no two paths clash.
const SOURCES: Readonly<Record<string, string>> = {
  ...import.meta.glob<string>(["../**/*.ts", "../**/*.tsx"], {
    base: "/src/quota",
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob<string>(
    ["../../**/*.ts", "../../**/*.tsx", "!../../system/**"],
    {
      base: "/test/component-integration/quota",
      query: "?raw",
      import: "default",
      eager: true,
    },
  ),
};

// The modules that may make a grant: the quota check, its stand-in for dependency-backed
// tests, and this test.
const GRANTERS = new Set([
  "./quota.ts",
  "./quota-test-kit.ts",
  "./quota-grant.test.ts",
]);

const NAMES_GRANT_MODULE = /quota-grant(?:\.ts)?["']/u;

// A test helper, which may hand out grants, so only tests may name one:
// quota-test-kit.ts directly, or another test kit that wraps it.
const NAMES_TEST_KIT = /-test-kit(?:\.tsx?)?["']/u;
const IS_TEST_CODE = /(?:\.test|-test-kit)\.tsx?$/u;

// A type assertion to QuotaGrant (`as QuotaGrant`, `as unknown as
// QuotaGrant` or `<QuotaGrant>x`), which would make a grant without the check.
const CASTS_TO_GRANT = /\bas\s+QuotaGrant\b|(?<![\w$])<QuotaGrant>/u;
const IS_TEST = /\.test\.tsx?$/u;

describe("grantQuota", () => {
  test("is imported only by checkQuota and its test stand-in, so no other caller skips the check", () => {
    const importers = Object.entries(SOURCES)
      .filter(([, source]) => NAMES_GRANT_MODULE.test(source))
      .map(([path]) => path.replace("../quota/", "./"));

    expect(importers).toContain("./quota.ts");
    expect(importers.filter((path) => !GRANTERS.has(path))).toEqual([]);
  });

  test("reaches production code through no test kit, so quota-test-kit's grant stays in tests", () => {
    const kitImporters = Object.entries(SOURCES)
      .filter(([, source]) => NAMES_TEST_KIT.test(source))
      .map(([path]) => path);

    expect(kitImporters).toContain("../replies/model-spend.server.test.ts");
    expect(kitImporters.filter((path) => !IS_TEST_CODE.test(path))).toEqual([]);
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
