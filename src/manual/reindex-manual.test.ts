import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { manualSections } from "@/db/tables/manual-sections";
import type { ManualSection } from "@/manual/manual-sections";
import { MANUAL_BRANCH } from "@/manual/manual-source";
import {
  cloneManual,
  type ManualDatabase,
  replaceManualSections,
} from "@/manual/reindex-manual";

describe("cloneManual", () => {
  let workDir: string;

  function git(cwd: string, ...args: string[]): string {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  }

  async function commitIndex(source: string, content: string) {
    await writeFile(join(source, "manual/index.rst"), content);
    git(source, "add", ".");
    git(
      source,
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-qm",
      content,
    );
  }

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "clone-manual-"));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("makes a shallow clone of the release branch", async () => {
    const source = join(workDir, "source");
    await mkdir(join(source, "manual"), { recursive: true });
    git(source, "init", "-q", "-b", "main");
    await commitIndex(source, "Old\n");
    git(source, "checkout", "-q", "-b", MANUAL_BRANCH);
    await commitIndex(source, "Release\n");
    git(source, "checkout", "-q", "main");
    await commitIndex(source, "Development\n");

    const target = join(workDir, "clone");
    cloneManual(target, pathToFileURL(source).href);

    expect(await readFile(join(target, "manual/index.rst"), "utf8")).toBe(
      "Release\n",
    );
    expect(git(target, "rev-parse", "--is-shallow-repository")).toBe("true");
  });
});

describe("replaceManualSections", () => {
  function section(title: string): ManualSection {
    return {
      title,
      text: "",
      filePath: "manual/index.rst",
      url: "",
      anchor: "",
    };
  }

  it("deletes every row, then inserts the sections in batches, in one transaction", async () => {
    const calls: string[] = [];
    const transaction = {
      delete: async (table: unknown) => {
        calls.push(table === manualSections ? "delete" : "delete other");
      },
      insert: (table: unknown) => ({
        values: async (rows: ManualSection[]) => {
          calls.push(
            `${table === manualSections ? "insert" : "insert other"} ${rows.length}`,
          );
        },
      }),
    };
    const database = {
      transaction: async (run: (tx: typeof transaction) => Promise<void>) => {
        calls.push("begin");
        await run(transaction);
        calls.push("commit");
      },
    } as unknown as ManualDatabase;
    const sections = Array.from({ length: 2500 }, (_, index) =>
      section(`Section ${index}`),
    );

    await replaceManualSections(database, sections);

    expect(calls).toEqual([
      "begin",
      "delete",
      "insert 1000",
      "insert 1000",
      "insert 500",
      "commit",
    ]);
  });
});
