/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";

// Every source file in src/ and test/ but this one, which names what it
// looks for, and the Playwright specs in test/system/: by path, relative to
// src/db/ and test/component-integration/db/; each test level mirrors src/'s
// folders, so no two paths clash.
const SOURCES: Readonly<Record<string, string>> = {
  ...import.meta.glob<string>("../**/*.{ts,tsx}", {
    base: "/src/db",
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob<string>(
    ["../../**/*.{ts,tsx}", "!../../system/**", "!./lint-suppressions.test.ts"],
    {
      base: "/test/component-integration/db",
      query: "?raw",
      import: "default",
      eager: true,
    },
  ),
};

const SUPPRESSION = /biome-ignore\s+(?<rule>\S+):\s*(?<reason>.*)/gu;

function suppressions(): { path: string; rule: string; reason: string }[] {
  return Object.entries(SOURCES).flatMap(([path, source]) =>
    [...source.matchAll(SUPPRESSION)].map((match) => {
      const { rule = "", reason = "" } = match.groups ?? {};
      return { path, rule, reason };
    }),
  );
}

// monthly_spend's key was the only use of drizzle's primaryKey, and its
// noDeprecatedImports suppression the only one; both went with the table.
// A new composite key uses the { columns } overload, and its suppression
// must name https://github.com/biomejs/biome/issues/7636.
describe("lint suppressions", () => {
  test("no source declares a key with drizzle's PrimaryKeyBuilder", () => {
    expect(
      Object.keys(SOURCES).filter((path) =>
        SOURCES[path]?.includes("PrimaryKeyBuilder"),
      ),
    ).toEqual([]);
  });

  test("suppress only noDeprecatedImports' false positive on primaryKey", () => {
    expect(
      suppressions().filter(
        ({ rule, reason }) =>
          rule !== "lint/suspicious/noDeprecatedImports" ||
          !reason.includes("https://github.com/biomejs/biome/issues/7636"),
      ),
    ).toEqual([]);
  });
});
