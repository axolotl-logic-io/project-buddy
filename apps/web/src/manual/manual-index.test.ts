// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "@/db/fake-neon-http.ts";
import { addManualSections } from "@/manual/manual-index.ts";
import { manualSectionsFromRst } from "@/manual/manual-sections.ts";

const INSERT = /^insert into "manual_sections" .* returning "id"$/u;
const DELETE_BY_ID =
  /^delete from "manual_sections" where "manual_sections"\."id" in \(\$1, \$2\)$/u;

const BEVEL_PAGE = manualSectionsFromRst(
  "manual/modeling/meshes/editing/edge/bevel.rst",
  "Bevel\n=====\n\nRounds edges.\n\nOptions\n-------\n\nWidth.\n",
);

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("addManualSections", () => {
  test("inserts the sections and removes exactly those rows again", async () => {
    const database = fakeNeonHttp({
      kind: "rows",
      columns: [{ name: "id", type: "int4" }],
      rows: [["7"], ["8"]],
    });
    vi.stubGlobal("fetch", database.fetch);

    const remove = await addManualSections(BEVEL_PAGE);
    await remove();

    const [insert, deletion] = database.queries;
    expect(insert?.query).toMatch(INSERT);
    expect(insert?.params).toContain("Rounds edges.");
    expect(deletion?.query).toMatch(DELETE_BY_ID);
    expect(deletion?.params).toEqual(["7", "8"]);
  });

  test("adds nothing, and removes nothing, for no sections", async () => {
    const database = fakeNeonHttp({ kind: "rows", columns: [], rows: [] });
    vi.stubGlobal("fetch", database.fetch);

    const remove = await addManualSections([]);
    await remove();

    expect(database.queries).toEqual([]);
  });
});
