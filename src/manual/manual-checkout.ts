// The manual's release branch, cloned into memory with isomorphic-git: one
// branch, one commit deep, with no working tree. Reindexing needs no disk, no
// git binary and no Node built-ins. Git over HTTPS works even though the
// projects.blender.org web pages sit behind a bot challenge.
import { clone, listFiles, readBlob, resolveRef } from "isomorphic-git";
import { request } from "isomorphic-git/http/web";
import { createFsFromVolume, Volume } from "memfs";
import type { ManualFiles } from "./manual-sections.ts";
import { MANUAL_BRANCH, MANUAL_REPOSITORY_URL } from "./manual-source.ts";

// Where the clone sits in its in-memory file system.
const REPOSITORY_DIR = "/blender-manual";
const MANUAL_DIRECTORY = "manual/";
const RST_EXTENSION = ".rst";

function isManualRst(path: string): boolean {
  return path.startsWith(MANUAL_DIRECTORY) && path.endsWith(RST_EXTENSION);
}

// Clones MANUAL_BRANCH of MANUAL_REPOSITORY_URL and returns its RST files.
// The clone stays in memory while the files are in use.
export async function cloneManual(): Promise<ManualFiles> {
  const fs = createFsFromVolume(new Volume());
  // isomorphic-git keeps parsed packfiles here, so reads share them.
  const cache = {};
  await clone({
    fs,
    http: { request },
    cache,
    dir: REPOSITORY_DIR,
    url: MANUAL_REPOSITORY_URL,
    ref: MANUAL_BRANCH,
    singleBranch: true,
    depth: 1,
    noCheckout: true,
    noTags: true,
  });
  const commit = await resolveRef({ fs, dir: REPOSITORY_DIR, ref: "HEAD" });
  const decoder = new TextDecoder();
  return {
    async rstPaths(): Promise<string[]> {
      const paths = await listFiles({
        fs,
        dir: REPOSITORY_DIR,
        ref: commit,
        cache,
      });
      return paths.filter(isManualRst);
    },
    async read(filePath: string): Promise<string> {
      const { blob } = await readBlob({
        fs,
        dir: REPOSITORY_DIR,
        oid: commit,
        filepath: filePath,
        cache,
      });
      return decoder.decode(blob);
    },
  };
}
