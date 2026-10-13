import { describe, expect, test } from "vitest";
import { userIdFixture } from "@/id-fixtures.ts";
import { grantQuota } from "@/quota/quota-grant.ts";

// Every source file under src, by path relative to this directory.
const SOURCES = import.meta.glob<string>(["../**/*.ts", "../**/*.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
});

// The modules that may make a grant: the quota check, its stand-in for unit
// tests, and this test.
const GRANTERS = new Set([
  "./quota.ts",
  "./quota-test-kit.ts",
  "./quota-grant.test.ts",
]);

const NAMES_GRANT_MODULE = /quota-grant(?:\.ts)?["']/u;

describe("grantQuota", () => {
  test("grants owner's model calls", () => {
    const owner = userIdFixture();

    expect(grantQuota(owner).owner).toBe(owner);
  });

  test("is imported only by checkQuota and its unit-test stand-in, so no other caller skips the check", () => {
    const importers = Object.entries(SOURCES)
      .filter(([, source]) => NAMES_GRANT_MODULE.test(source))
      .map(([path]) => path.replace("../quota/", "./"));

    expect(importers).toContain("./quota.ts");
    expect(importers.filter((path) => !GRANTERS.has(path))).toEqual([]);
  });
});
