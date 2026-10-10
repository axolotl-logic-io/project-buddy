import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { checkoutFiles, cloneManual } from "@/manual/manual-checkout.ts";
import { MANUAL_BRANCH } from "@/manual/manual-source.ts";

let workDir = "";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function commitIndex(source: string, content: string): Promise<void> {
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
  workDir = await mkdtemp(join(tmpdir(), "manual-checkout-"));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("cloneManual", () => {
  test("makes a shallow clone of the release branch", async () => {
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

describe("checkoutFiles", () => {
  test("lists and reads only the RST files under manual/", async () => {
    await mkdir(join(workDir, "manual/modeling"), { recursive: true });
    await writeFile(join(workDir, "manual/index.rst"), "Home\n====\n");
    await writeFile(join(workDir, "manual/modeling/bevel.rst"), "Bevel\n");
    await writeFile(join(workDir, "manual/conf.py"), "project = 'x'\n");
    await writeFile(join(workDir, "README.rst"), "Readme\n======\n");
    const files = checkoutFiles(workDir);

    expect(
      (await files.rstPaths()).toSorted((left, right) =>
        left.localeCompare(right),
      ),
    ).toEqual(["manual/index.rst", "manual/modeling/bevel.rst"]);
    expect(await files.read("manual/modeling/bevel.rst")).toBe("Bevel\n");
  });
});
