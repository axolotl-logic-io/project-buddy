/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";

// Every source file in src/ and test/ but this one, which names what it
// looks for: by path, relative to src/db/ and test/db/; test/ mirrors src/'s
// folders, so no two paths clash.
const SOURCES: Readonly<Record<string, string>> = {
  ...import.meta.glob<string>("../**/*.{ts,tsx}", {
    base: "/src/db",
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob<string>(
    ["../**/*.{ts,tsx}", "!./monthly-spend-table.test.ts"],
    { base: "/test/db", query: "?raw", import: "default", eager: true },
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

describe("monthlySpend", () => {
  test("declares its key with drizzle's documented primaryKey", () => {
    const { "./tables/monthly-spend.ts": source = "" } = SOURCES;

    expect(source).toContain(
      "primaryKey({ columns: [table.userId, table.month] })",
    );
    expect(
      Object.keys(SOURCES).filter((path) =>
        SOURCES[path]?.includes("PrimaryKeyBuilder"),
      ),
    ).toEqual([]);
  });

  test("suppresses only noDeprecatedImports' false positive on primaryKey", () => {
    const [only, ...others] = suppressions();

    expect(others).toEqual([]);
    expect(only?.path).toBe("./tables/monthly-spend.ts");
    expect(only?.rule).toBe("lint/suspicious/noDeprecatedImports");
    expect(only?.reason).toContain(
      "https://github.com/biomejs/biome/issues/7636",
    );
  });
});
