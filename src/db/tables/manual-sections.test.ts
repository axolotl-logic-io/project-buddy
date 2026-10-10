import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { manualSections } from "@/db/tables/manual-sections";

describe("manualSections", () => {
  const config = getTableConfig(manualSections);

  it("stores each section's title, text, file path, URL and anchor", () => {
    expect(config.name).toBe("manual_sections");
    expect(config.columns.map((column) => column.name)).toEqual([
      "id",
      "title",
      "text",
      "file_path",
      "url",
      "anchor",
      "search",
    ]);
  });

  it("keeps a generated tsvector with a GIN index for full-text search", () => {
    const search = config.columns.find((column) => column.name === "search");

    expect(search?.getSQLType()).toBe("tsvector");
    expect(search?.generated?.type).toBe("always");
    expect(config.indexes.map((index) => index.config.method)).toEqual(["gin"]);
  });
});
