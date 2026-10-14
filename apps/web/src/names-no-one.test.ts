/// <reference types="vite/client" />
// No file in the repo names the repo's owner (#118): code, tests, comments
// and use cases name roles, and comments cite a decision's slug or an issue
// instead of who made it. Who decided stays in the wiki's Decisions, a
// separate repo. The name is kept here only as part of its SHA-256, so this
// test doesn't name her either.
import { describe, expect, test } from "vitest";

// The first 12 hex digits of the SHA-256 of the owner's first name, as it
// is written: enough that no other word in the repo shares them.
const OWNER_NAME_SHA256 = "e0906c2d6dc6";

// Every text file the repo writes words in, keyed by its path from
// apps/web/src/. Installed packages, build and test output and the wiki's
// checkout (its own repo, where each decision keeps who made it) are not
// the repo's own files. Env files are never read. Vite leaves this file out
// of its own glob.
const TEXT_FILES = import.meta.glob<string>(
  [
    "../../../**/*.{css,json,jsonc,md,mjs,mts,snap,sql,toml,ts,tsx,txt,yml}",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/.vercel/**",
    "!**/test-results/**",
    "!**/playwright-report/**",
    "!**/blob-report/**",
    "!**/coverage/**",
    "!../../../wiki/**",
  ],
  { query: "?raw", import: "default", eager: true },
);

const WORD = /\p{L}+/gu;
const HEX = 16;
const HEX_BYTE_DIGITS = 2;

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(HEX).padStart(HEX_BYTE_DIGITS, "0"))
    .join("");
}

// Each file's path that has a word whose SHA-256 starts with `hashStart`.
async function filesWithWord(hashStart: string): Promise<string[]> {
  const files = await Promise.all(
    Object.entries(TEXT_FILES).map(async ([path, text]) => {
      const words = new Set(text.match(WORD));
      const hashes = await Promise.all([...words].map(sha256));
      return { path, found: hashes.some((hash) => hash.startsWith(hashStart)) };
    }),
  );
  return files.filter((file) => file.found).map((file) => file.path);
}

describe("the repo", () => {
  test("is read from its own text files, at the root and in each app", () => {
    expect(Object.keys(TEXT_FILES)).toEqual(
      expect.arrayContaining([
        "../../../CONTRIBUTING.md",
        "../../../biome.jsonc",
        "../biome.jsonc",
        "../drizzle/0004_drop_pre_account_data.sql",
        "../e2e/viewports.ts",
        "../use-cases/README.md",
        "./errors/app-error.test.ts",
      ]),
    );
  });

  test("finds the files that have a word with a given hash", async () => {
    const hashStart = (await sha256("Scoped")).slice(
      0,
      OWNER_NAME_SHA256.length,
    );
    expect(await filesWithWord(hashStart)).toEqual([
      "../../../CONTRIBUTING.md",
    ]);
  });

  test("names the owner in no file", async () => {
    expect(await filesWithWord(OWNER_NAME_SHA256)).toEqual([]);
  });
});
