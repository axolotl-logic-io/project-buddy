import { describe, expect, test } from "vitest";
import {
  type ManualFiles,
  manualSectionsFromRst,
  readManualSections,
} from "@/manual/manual-sections.ts";

const MANY_FILES = 200;
const PAGE_NUMBER_DIGITS = 3;

// Manual files held in memory, keyed by path.
function filesInMemory(
  contents: Readonly<Record<string, string>>,
): ManualFiles {
  return {
    pagePaths(): Promise<string[]> {
      return Promise.resolve(Object.keys(contents));
    },
    read(filePath: string): Promise<string> {
      return Promise.resolve(contents[filePath] ?? "");
    },
  };
}

describe("manualSectionsFromRst", () => {
  test("adds the file path and URL to each section", () => {
    expect(
      manualSectionsFromRst("manual/index.rst", "Manual\n======\n\nWelcome.\n"),
    ).toEqual([
      {
        title: "Manual",
        text: "Welcome.",
        filePath: "manual/index.rst",
        url: "https://docs.blender.org/manual/en/latest/index.html#manual",
        anchor: "manual",
      },
    ]);
  });
});

describe("readManualSections", () => {
  test("splits every page in path order", async () => {
    const sections = await readManualSections(
      filesInMemory({
        "manual/modeling/bevel.rst": "Bevel\n=====\n\nRounds edges.\n",
        "manual/index.rst": "Home\n====\n",
      }),
    );

    expect(
      sections.map(({ filePath, anchor }) => `${filePath}#${anchor}`),
    ).toEqual(["manual/index.rst#home", "manual/modeling/bevel.rst#bevel"]);
  });

  test("keeps path order across many files", async () => {
    const paths = Array.from(
      { length: MANY_FILES },
      (_, index) =>
        `manual/page-${String(index).padStart(PAGE_NUMBER_DIGITS, "0")}.rst`,
    );
    const files = filesInMemory(
      Object.fromEntries(
        paths.toReversed().map((path) => [path, "Page\n====\n"]),
      ),
    );

    const sections = await readManualSections(files);

    expect(sections.map(({ filePath }) => filePath)).toEqual(paths);
  });
});
