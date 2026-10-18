// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AppError } from "@/errors/app-error.ts";
import { searchManual } from "@/manual/search-manual.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";

const DEFAULT_LIMIT = 10;
const CHOSEN_LIMIT = 5;
const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const BEVEL_PATH = "manual/modeling/meshes/editing/edge/bevel.rst";

const RANKED_BY_TS_RANK =
  /order by ts_rank\("manual_sections"\."search", websearch_to_tsquery\('english', \$2\)\) desc/u;
const LIMITED_BY_THIRD_PARAMETER = /limit \$3$/u;

const SECTION_COLUMNS = [
  { name: "title", type: "text" },
  { name: "pageTitle", type: "text" },
  { name: "url", type: "text" },
  { name: "anchor", type: "text" },
  { name: "file_path", type: "text" },
  { name: "text", type: "text" },
] as const;

function answerWith(answer: NeonHttpAnswer): FakeNeonHttp {
  const neonHttp = fakeNeonHttp(answer);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("searchManual failures", () => {
  test("rejects with a logged AppError when the query fails", async () => {
    const log = spyOnErrorLog();
    answerWith({
      kind: "postgres-error",
      code: "42P01",
      message: 'relation "manual_sections" does not exist',
    });

    const error = await searchManual("bevel").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AppError);
    expect(error).toHaveProperty("errorCase", "database-query-failed");
    expect(log).toHaveBeenCalledWith(
      "[app-error] database-query-failed in searchManual",
      expect.any(String),
    );
  });
});

describe("searchManual queries", () => {
  test("matches the query as web-search keywords, best ranked first", async () => {
    const neonHttp = answerWith({ kind: "rows", columns: [], rows: [] });

    await searchManual("bevel width", CHOSEN_LIMIT);

    const [query] = neonHttp.queries;
    expect(query?.query).toContain(
      `"manual_sections"."search" @@ websearch_to_tsquery('english', $1)`,
    );
    expect(query?.query).toMatch(RANKED_BY_TS_RANK);
    expect(query?.query).toMatch(LIMITED_BY_THIRD_PARAMETER);
    // The driver sends every parameter as text.
    expect(query?.params).toEqual([
      "bevel width",
      "bevel width",
      String(CHOSEN_LIMIT),
    ]);
  });
});

describe("searchManual labels", () => {
  test("labels each section by its page's first heading, found by the smallest id", async () => {
    const neonHttp = answerWith({ kind: "rows", columns: [], rows: [] });

    await searchManual("bevel");

    expect(neonHttp.queries[0]?.query).toContain(
      '(select "page"."title" from "manual_sections" as "page" where "page"."file_path" = "manual_sections"."file_path" order by "page"."id" limit 1)',
    );
  });

  test("returns each section's title, label, URL, anchor, file path and text", async () => {
    const neonHttp = answerWith({
      kind: "rows",
      columns: SECTION_COLUMNS,
      rows: [
        [
          "Usage",
          "Bevel",
          BEVEL_URL,
          "usage",
          BEVEL_PATH,
          "Press :kbd:`Ctrl-B`.",
        ],
      ],
    });

    expect(await searchManual("bevel")).toEqual([
      {
        title: "Usage",
        label: "Bevel › Usage",
        url: BEVEL_URL,
        anchor: "usage",
        filePath: BEVEL_PATH,
        text: "Press :kbd:`Ctrl-B`.",
      },
    ]);
    expect(neonHttp.queries[0]?.params).toEqual([
      "bevel",
      "bevel",
      String(DEFAULT_LIMIT),
    ]);
  });

  test("labels a page's top section with its heading alone", async () => {
    answerWith({
      kind: "rows",
      columns: SECTION_COLUMNS,
      rows: [["Bevel", "Bevel", BEVEL_URL, "bevel", BEVEL_PATH, "Bevels."]],
    });

    const [section] = await searchManual("bevel");

    expect(section?.label).toBe("Bevel");
  });
});
