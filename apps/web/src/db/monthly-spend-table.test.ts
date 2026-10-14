/// <reference types="vite/client" />
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, test } from "vitest";
import { monthlySpend } from "@/db/tables/monthly-spend.ts";

// Every source file in src/ but this one, which names what it looks for: by
// path, relative to this directory.
const SOURCES = import.meta.glob<string>(
  ["../**/*.{ts,tsx}", "!./monthly-spend-table.test.ts"],
  { query: "?raw", import: "default", eager: true },
);

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
  test("keys each row by user and month", () => {
    const [key, ...others] = getTableConfig(monthlySpend).primaryKeys;

    expect(others).toEqual([]);
    expect(key?.getName()).toBe("monthly_spend_user_id_month_pk");
    expect(key?.columns.map((column) => column.name)).toEqual([
      "user_id",
      "month",
    ]);
  });

  test("declares its key with drizzle's documented primaryKey", () => {
    const source = SOURCES["./tables/monthly-spend.ts"] ?? "";

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
