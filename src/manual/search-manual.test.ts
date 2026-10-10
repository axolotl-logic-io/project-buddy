import { drizzle } from "drizzle-orm/neon-http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchManual } from "@/manual/search-manual";

// Stands in for the Neon HTTP client: records each query and answers with
// rows in array mode, as Neon does for drizzle selects.
const neonQuery =
  vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();

vi.mock("@/db/client", () => ({
  getDb: () => drizzle({ client: neonQuery as never }),
}));

describe("searchManual", () => {
  beforeEach(() => {
    neonQuery.mockReset();
    neonQuery.mockResolvedValue({ rows: [] });
  });

  it("matches the query as web-search keywords, best ranked first", async () => {
    await searchManual("bevel width", 5);

    const [sql, params] = neonQuery.mock.calls[0];
    expect(sql).toContain(
      `"manual_sections"."search" @@ websearch_to_tsquery('english', $1)`,
    );
    expect(sql).toMatch(
      /order by ts_rank\("manual_sections"\."search", websearch_to_tsquery\('english', \$2\)\) desc/,
    );
    expect(sql).toMatch(/limit \$3$/);
    expect(params).toEqual(["bevel width", "bevel width", 5]);
  });

  it("returns each section's title, URL, anchor, file path and text", async () => {
    neonQuery.mockResolvedValue({
      rows: [
        [
          "Usage",
          "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage",
          "usage",
          "manual/modeling/meshes/editing/edge/bevel.rst",
          "Press :kbd:`Ctrl-B`.",
        ],
      ],
    });

    expect(await searchManual("bevel")).toEqual([
      {
        title: "Usage",
        url: "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage",
        anchor: "usage",
        filePath: "manual/modeling/meshes/editing/edge/bevel.rst",
        text: "Press :kbd:`Ctrl-B`.",
      },
    ]);
    expect(neonQuery.mock.calls[0][1]).toEqual(["bevel", "bevel", 10]);
  });
});
