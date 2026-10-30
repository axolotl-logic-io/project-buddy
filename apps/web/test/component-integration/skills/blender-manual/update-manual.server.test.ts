// "use_case_update_manual" in use-cases/site-upkeep.md: a new release of
// the manual replaces the old one in one go, a reindex that fails partway
// keeps the copy before it, and running it again changes nothing. The
// reindex runs as the reindex command runs it, against a scratch database of
// this test's own, since a full reindex replaces every manual section, and
// the shared test database's are other tests' to use as it runs.
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { expect, test, vi } from "vitest";
import { openPool } from "@/db/client.ts";
import { manualSections } from "@/db/tables/manual-sections.ts";
import {
  MANUAL_BRANCH,
  MANUAL_REPOSITORY_URL,
} from "@/skills/blender-manual/manual-source.ts";
import { reindexManual } from "@/skills/blender-manual/reindex-manual.ts";
import { searchManual } from "@/skills/blender-manual/search-manual.ts";
import {
  dropTestDatabase,
  resetTestDatabase,
  type TestDatabase,
} from "../../../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../../test-database/scratch-database-test-kit.ts";
import { fakeGitHttp } from "./fake-git-http.ts";

type Pool = ReturnType<typeof openPool>;

// The scratch database's suffix, apart from every other test's.
const SCRATCH_SUFFIX = "_update_manual";

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

// A manual section as the index holds it.
interface IndexedSection {
  readonly title: string;
  readonly url: string;
  readonly anchor: string;
  readonly filePath: string;
  readonly text: string;
}

// Runs the manual's reindex against database, as the reindex command does,
// with the manual's repository served from memory holding release on the
// release branch.
async function reindexRelease(
  database: TestDatabase,
  release: ManualRelease,
): Promise<void> {
  const git = await fakeGitHttp(MANUAL_REPOSITORY_URL, {
    [MANUAL_BRANCH]: release,
  });
  vi.stubGlobal("fetch", git.fetch);
  try {
    await reindexManual(database.url, () => undefined);
  } finally {
    vi.unstubAllGlobals();
  }
}

// Every section of the manual index pool reaches, in the order indexed.
function indexedSections(pool: Pool): Promise<IndexedSection[]> {
  return drizzle({ client: pool })
    .select({
      title: manualSections.title,
      url: manualSections.url,
      anchor: manualSections.anchor,
      filePath: manualSections.filePath,
      text: manualSections.text,
    })
    .from(manualSections)
    .orderBy(asc(manualSections.id));
}

test("use_case_update_manual", async () => {
  const scratch = scratchDatabase(SCRATCH_SUFFIX);
  await resetTestDatabase(scratch);
  const pool = openPool(scratch.url);
  try {
    await reindexRelease(scratch, OLD_RELEASE);
    expect(
      (await indexedSections(pool)).map(({ title }) => title),
    ).toStrictEqual(["Zebrafold"]);

    // The new release replaces the old one in one go.
    await reindexRelease(scratch, NEW_RELEASE);
    const newCopy = await indexedSections(pool);
    expect(newCopy).toStrictEqual([
      {
        title: "Quillwarp",
        url: "https://docs.blender.org/manual/en/latest/modeling/quillwarp.html#quillwarp",
        anchor: "quillwarp",
        filePath: "manual/modeling/quillwarp.rst",
        text: "The quillwarp modifier, new in this release, warps a mesh like a quill.",
      },
    ]);

    // A reindex that fails partway keeps the copy before it.
    await expect(reindexRelease(scratch, BROKEN_RELEASE)).rejects.toThrow();
    expect(await indexedSections(pool)).toStrictEqual(newCopy);

    // Running it again gives the same rows.
    await reindexRelease(scratch, NEW_RELEASE);
    expect(await indexedSections(pool)).toStrictEqual(newCopy);

    // The shared test database's index is left as it was.
    expect(await searchManual("quillwarp")).toStrictEqual([]);
  } finally {
    await pool.end();
    await dropTestDatabase(scratch);
  }
});
