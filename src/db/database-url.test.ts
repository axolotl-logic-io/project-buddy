import { describe, expect, it } from "vitest";
import { readDatabaseUrl } from "@/db/database-url";

describe("readDatabaseUrl", () => {
  it("returns DATABASE_URL from the given environment", () => {
    const url = "postgresql://user:pass@example.neon.tech/db?sslmode=require";

    expect(readDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it("throws a descriptive error when DATABASE_URL is missing", () => {
    expect(() => readDatabaseUrl({})).toThrow(/DATABASE_URL is not set/);
  });

  it("throws when DATABASE_URL is blank", () => {
    expect(() => readDatabaseUrl({ DATABASE_URL: "  " })).toThrow(
      /DATABASE_URL is not set/,
    );
  });
});
