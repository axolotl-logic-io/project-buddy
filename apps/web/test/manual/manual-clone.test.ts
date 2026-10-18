// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { cloneManual } from "@/manual/manual-clone.ts";
import {
  MANUAL_BRANCH,
  MANUAL_REPOSITORY_URL,
} from "@/manual/manual-source.ts";
import { fakeGitHttp } from "./fake-git-http.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cloneManual", () => {
  test("clones the release branch, not the development branch", async () => {
    const server = await fakeGitHttp(MANUAL_REPOSITORY_URL, {
      main: { "manual/index.rst": "Development\n" },
      [MANUAL_BRANCH]: { "manual/index.rst": "Release\n" },
    });
    vi.stubGlobal("fetch", server.fetch);

    const files = await cloneManual();

    expect(await files.read("manual/index.rst")).toBe("Release\n");
  });

  test("lists and reads only the manual's pages", async () => {
    const server = await fakeGitHttp(MANUAL_REPOSITORY_URL, {
      [MANUAL_BRANCH]: {
        "manual/index.rst": "Home\n====\n",
        "manual/modeling/bevel.rst": "Bevel\n",
        "manual/conf.py": "project = 'x'\n",
        "README.rst": "Readme\n======\n",
      },
    });
    vi.stubGlobal("fetch", server.fetch);

    const files = await cloneManual();

    expect(
      (await files.pagePaths()).toSorted((left, right) =>
        left.localeCompare(right),
      ),
    ).toEqual(["manual/index.rst", "manual/modeling/bevel.rst"]);
    expect(await files.read("manual/modeling/bevel.rst")).toBe("Bevel\n");
  });
});
