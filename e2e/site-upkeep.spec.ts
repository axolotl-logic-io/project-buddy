import { expect } from "@playwright/test";
import { fakeGitHttp } from "@/manual/fake-git-http.ts";
import {
  MANUAL_BRANCH,
  MANUAL_REPOSITORY_URL,
} from "@/manual/manual-source.ts";
import { reindexManual } from "@/manual/reindex-manual.ts";
import { searchManual } from "@/manual/search-manual.ts";
import { COPY } from "@/ui/copy.ts";
import { checkTestEnvironment } from "../scripts/test-db/test-database.ts";
import { test } from "./fixtures.ts";
import { WHOLE_DATABASE_TAG } from "./whole-database.ts";

// A release's manual pages, keyed by path from the repository root.
type ManualRelease = Readonly<Record<string, string>>;

// More sections than one INSERT of the reindex holds, so a failure in the
// last section comes after earlier sections are already inserted.
const SECTIONS_IN_BROKEN_RELEASE = 1500;

function rstSection(title: string, text: string): string {
  return `${title}\n${"=".repeat(title.length)}\n\n${text}\n`;
}

const OLD_RELEASE: ManualRelease = {
  "manual/modeling/zebrafold.rst": rstSection(
    "Zebrafold",
    "The zebrafold modifier folds a mesh in stripes.",
  ),
};

const NEW_RELEASE: ManualRelease = {
  "manual/modeling/quillwarp.rst": rstSection(
    "Quillwarp",
    "The quillwarp modifier, new in this release, warps a mesh like a quill.",
  ),
};

// A release whose last section holds a NUL character, which Postgres refuses
// to store, so its reindex fails partway through inserting.
const BROKEN_RELEASE: ManualRelease = {
  "manual/modeling/glimmerknot.rst": [
    rstSection("Glimmerknot", "The glimmerknot tool ties edges in knots."),
    ...Array.from({ length: SECTIONS_IN_BROKEN_RELEASE - 2 }, (_, index) =>
      rstSection(`Filler ${index}`, "Filler text."),
    ),
    rstSection("Broken", "This text holds a NUL: \u0000."),
  ].join("\n"),
};

// Runs the manual's reindex against the test database, as the reindex
// commands do, with the manual's repository served from memory holding
// release on the release branch.
async function reindexRelease(release: ManualRelease): Promise<void> {
  const git = await fakeGitHttp(MANUAL_REPOSITORY_URL, {
    [MANUAL_BRANCH]: release,
  });
  const networkFetch = globalThis.fetch;
  globalThis.fetch = git.fetch;
  try {
    await reindexManual(checkTestEnvironment().url, () => undefined);
  } finally {
    globalThis.fetch = networkFetch;
  }
}

test("use_case_see_manual_credit", async ({ page }) => {
  await page.goto("/login");

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: COPY.footer.manual }),
  ).toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
  await expect(
    footer.getByRole("link", { name: COPY.footer.license }),
  ).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
});

// A full reindex deletes every manual section, including the ones other
// tests add, so this test needs the database to itself.
test("use_case_update_manual", { tag: WHOLE_DATABASE_TAG }, async () => {
  await reindexRelease(OLD_RELEASE);
  expect(await searchManual("zebrafold")).toHaveLength(1);

  await test.step("the new release replaces the old one in one go", async () => {
    await reindexRelease(NEW_RELEASE);

    expect(await searchManual("zebrafold")).toEqual([]);
    expect(await searchManual("quillwarp")).toEqual([
      {
        title: "Quillwarp",
        label: "Quillwarp",
        url: "https://docs.blender.org/manual/en/latest/modeling/quillwarp.html#quillwarp",
        anchor: "quillwarp",
        filePath: "manual/modeling/quillwarp.rst",
        text: "The quillwarp modifier, new in this release, warps a mesh like a quill.",
      },
    ]);
  });

  await test.step("a reindex that fails partway keeps the old copy", async () => {
    const before = await searchManual("quillwarp");

    await expect(reindexRelease(BROKEN_RELEASE)).rejects.toThrow();

    expect(await searchManual("glimmerknot")).toEqual([]);
    expect(await searchManual("filler")).toEqual([]);
    expect(await searchManual("quillwarp")).toEqual(before);
  });

  await test.step("running it again gives the same result", async () => {
    const before = await searchManual("quillwarp");

    await reindexRelease(NEW_RELEASE);

    expect(await searchManual("quillwarp")).toEqual(before);
    expect(await searchManual("zebrafold")).toEqual([]);
  });
});
