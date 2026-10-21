// @vitest-environment node
// searchManual's rows read as sections, and its failures. What it finds,
// in what order, is search-manual.server.test.ts's.
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

const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const BEVEL_PATH = "manual/modeling/meshes/editing/edge/bevel.rst";

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

describe("searchManual labels", () => {
  test("returns each section's title, label, URL, anchor, file path and text", async () => {
    answerWith({
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
