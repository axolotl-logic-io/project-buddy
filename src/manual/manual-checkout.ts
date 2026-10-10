// The manual's git checkout on disk: the one Node-only part of reindexing.
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ManualFiles } from "./manual-sections.ts";
import { MANUAL_BRANCH, MANUAL_REPOSITORY_URL } from "./manual-source.ts";

const WINDOWS_PATH_SEPARATOR = "\\";

// A shallow clone of the release branch only. Plain git over HTTPS works even
// though the projects.blender.org web pages sit behind a bot challenge.
export function cloneManual(
  targetDir: string,
  repositoryUrl = MANUAL_REPOSITORY_URL,
): void {
  execFileSync(
    "git",
    [
      "clone",
      "--quiet",
      "--depth=1",
      `--branch=${MANUAL_BRANCH}`,
      repositoryUrl,
      targetDir,
    ],
    { stdio: "inherit" },
  );
}

// The RST files under manual/ in a checkout at repositoryDir.
export function checkoutFiles(repositoryDir: string): ManualFiles {
  return {
    async rstPaths(): Promise<string[]> {
      const paths = await readdir(join(repositoryDir, "manual"), {
        recursive: true,
      });
      return paths
        .filter((path) => path.endsWith(".rst"))
        .map(
          (path) => `manual/${path.split(WINDOWS_PATH_SEPARATOR).join("/")}`,
        );
    },
    read(filePath: string): Promise<string> {
      return readFile(join(repositoryDir, filePath), "utf8");
    },
  };
}

// Clones the manual's release branch into a temporary directory, hands its
// files to `use` and removes the clone afterwards.
export async function withManualCheckout<Result>(
  use: (files: ManualFiles) => Promise<Result>,
): Promise<Result> {
  const repositoryDir = await mkdtemp(join(tmpdir(), "blender-manual-"));
  try {
    cloneManual(repositoryDir);
    return await use(checkoutFiles(repositoryDir));
  } finally {
    await rm(repositoryDir, { recursive: true, force: true });
  }
}
