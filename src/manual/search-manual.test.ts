// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { searchManual } from "@/manual/search-manual.ts";

const DEFAULT_LIMIT = 10;
const CHOSEN_LIMIT = 5;
const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const BEVEL_PATH = "manual/modeling/meshes/editing/edge/bevel.rst";

const RANKED_BY_TS_RANK =
  /order by ts_rank\("manual_sections"\."search", websearch_to_tsquery\('english', \$2\)\) desc/u;
const LIMITED_BY_THIRD_PARAMETER = /limit \$3$/u;

function answerWith(answer: NeonHttpAnswer): FakeNeonHttp {
  const neonHttp = fakeNeonHttp(answer);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

describe("searchManual", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("rejects with a logged AppError when the query fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {
      // The test reads the calls; the output would only be noise.
    });
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

  test("returns each section's title, URL, anchor, file path and text", async () => {
    const neonHttp = answerWith({
      kind: "rows",
      columns: [
        { name: "title", type: "text" },
        { name: "url", type: "text" },
        { name: "anchor", type: "text" },
        { name: "file_path", type: "text" },
        { name: "text", type: "text" },
      ],
      rows: [["Usage", BEVEL_URL, "usage", BEVEL_PATH, "Press :kbd:`Ctrl-B`."]],
    });

    expect(await searchManual("bevel")).toEqual([
      {
        title: "Usage",
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
});
