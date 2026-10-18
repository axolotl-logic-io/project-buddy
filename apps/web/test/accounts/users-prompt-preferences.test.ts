// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { readPromptPreferences } from "@/accounts/users-store.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "../db/fake-neon-http.ts";
import { userIdFixture } from "../id-fixtures.ts";

const USER_ID = userIdFixture();

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("prompt preferences", () => {
  function storedPreferences(
    rows: readonly (readonly (string | null)[])[],
  ): FakeNeonHttp {
    const neonHttp = fakeNeonHttp({
      kind: "rows",
      columns: [
        { name: "name", type: "text" },
        { name: "hidden_extras", type: "_text" },
      ],
      rows,
    });
    vi.stubGlobal("fetch", neonHttp.fetch);
    return neonHttp;
  }

  test("reads name and saved switches together for the owner", async () => {
    const neonHttp = storedPreferences([["Mabel", "{brainstorming}"]]);

    expect(await readPromptPreferences(USER_ID)).toEqual({
      userName: "Mabel",
      hiddenExtras: ["brainstorming"],
    });
    expect(neonHttp.queries).toHaveLength(1);
    expect(neonHttp.queries[0]?.params).toEqual([USER_ID]);
  });

  test("an unnamed account keeps its saved switches", async () => {
    storedPreferences([[null, "{project-breakdown}"]]);

    expect(await readPromptPreferences(USER_ID)).toEqual({
      userName: undefined,
      hiddenExtras: ["project-breakdown"],
    });
  });

  test("an absent account has no name or switches", async () => {
    storedPreferences([]);

    expect(await readPromptPreferences(USER_ID)).toEqual({
      userName: undefined,
      hiddenExtras: [],
    });
  });
});
