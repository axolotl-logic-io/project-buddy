import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  manualSectionsFromRst,
  manualUrl,
  readManualSections,
} from "@/manual/manual-sections.ts";

describe("manualUrl", () => {
  test("builds the latest manual URL for a file under manual/", () => {
    expect(
      manualUrl("manual/modeling/meshes/editing/edge/bevel.rst", "usage"),
    ).toBe(
      "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage",
    );
  });
});

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
  let repository: string;

  beforeEach(async () => {
    repository = await mkdtemp(join(tmpdir(), "manual-sections-"));
    await mkdir(join(repository, "manual/modeling"), { recursive: true });
    await writeFile(join(repository, "manual/index.rst"), "Home\n====\n");
    await writeFile(
      join(repository, "manual/modeling/bevel.rst"),
      "Bevel\n=====\n\nRounds edges.\n",
    );
    await writeFile(join(repository, "manual/conf.py"), "project = 'x'\n");
    await writeFile(join(repository, "README.rst"), "Readme\n======\n");
  });

  afterEach(async () => {
    await rm(repository, { recursive: true, force: true });
  });

  test("splits every RST file under manual/ in path order", async () => {
    const sections = await readManualSections(repository);

    expect(
      sections.map(({ filePath, anchor }) => `${filePath}#${anchor}`),
    ).toEqual(["manual/index.rst#home", "manual/modeling/bevel.rst#bevel"]);
  });
});
