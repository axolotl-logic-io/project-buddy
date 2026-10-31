// searchManual against the test database: sections are found by
// web-search keywords, best ranked first, up to the limit, and each is
// labelled by its page's first heading. The made-up words are this file's
// own, so other files' sections never match.
import { expect, test } from "vitest";
import { searchManual } from "@/blender-manual/search-manual.ts";
import {
  manualSection,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const ZORB_PAGE = "modeling/meshes/editing/face/zorb";
// The page's first heading, which labels its other sections.
const ZORB_TOOL = manualSection(
  ZORB_PAGE,
  "zorb-tool",
  "Zorb Tool",
  "Zorb the selected faces once.",
);
const ZORB_DEPTH = manualSection(
  ZORB_PAGE,
  "zorb-depth",
  "Zorb Depth",
  "A deeper zorb zorbs the zorbed faces again; each zorb adds depth.",
);
const PLIMSY_ZORB = manualSection(
  ZORB_PAGE,
  "plimsy-zorb",
  "Plimsy Zorb",
  "A plimsy zorb keeps the faces' edges.",
);

function byText(one: string, other: string): number {
  return one.localeCompare(other);
}

// Adds the zorb page's sections, its first heading first.
async function zorbPage(): Promise<void> {
  await testData(await testUser()).manualSections([
    ZORB_TOOL,
    ZORB_DEPTH,
    PLIMSY_ZORB,
  ]);
}

// The titles of the sections a search finds.
async function titlesFound(query: string, limit?: number): Promise<string[]> {
  return (await searchManual(query, limit)).map(({ title }) => title);
}

test("finds the best-ranked section first", async () => {
  await zorbPage();

  expect((await titlesFound("zorb"))[0]).toBe(ZORB_DEPTH.title);
});

test("reads the query as web-search keywords", async () => {
  await zorbPage();

  expect(await titlesFound('"plimsy zorb"')).toEqual([PLIMSY_ZORB.title]);
  expect((await titlesFound("zorb -plimsy")).toSorted(byText)).toEqual(
    [ZORB_DEPTH.title, ZORB_TOOL.title].toSorted(byText),
  );
});

test("finds no more sections than the limit", async () => {
  await zorbPage();

  expect(await titlesFound("zorb", 1)).toHaveLength(1);
});

test("labels a section by its page's first heading, and the first heading alone", async () => {
  await zorbPage();

  const labels = (await searchManual("zorb")).map(({ label }) => label);

  expect(labels.toSorted(byText)).toEqual(
    [
      ZORB_TOOL.title,
      `${ZORB_TOOL.title} › ${ZORB_DEPTH.title}`,
      `${ZORB_TOOL.title} › ${PLIMSY_ZORB.title}`,
    ].toSorted(byText),
  );
});
