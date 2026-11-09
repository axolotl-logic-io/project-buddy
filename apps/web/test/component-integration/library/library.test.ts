/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import SOURCE_MAP from "../../../../../docs/library.md?raw";
import { PROMPT_KINDS } from "../../../src/prompts/prompt.ts";
import { LIBRARY_COPY } from "../../../src/ui/copy/library.ts";

const SOURCES = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});
const MODEL_CALL =
  /\b(?:generateText|streamText|generateImage|embed|embedMany)\s*\(/u;
const SOURCE_PATH = /`(?<path>[a-z][a-z0-9/()_-]*(?:\.tsx?|\/))`/gu;
const IMAGE_PROVIDER_IMPORT = /from\s+["']@\/images\/image-provider\.ts["']/u;

function destinationExists(href: string): boolean {
  const url = new URL(href, "https://library.example");
  if (url.pathname.startsWith("/library/")) {
    return LIBRARY_COPY.books.some(
      (book) =>
        url.pathname === `/library/${book.id}` &&
        (url.hash === "" ||
          book.chapters.some((chapter) => `#${chapter.id}` === url.hash)),
    );
  }
  if (
    url.search !== "" &&
    (url.pathname !== "/workshop" ||
      !PROMPT_KINDS.some((kind) => kind === url.searchParams.get("kind")))
  ) {
    return false;
  }
  const action = `/src/app/(workspace)${url.pathname}`;
  return Object.keys(SOURCES).some(
    (file) =>
      file === `${action}/page.tsx` || file === `${action}/(list)/page.tsx`,
  );
}

describe("Library maintenance", () => {
  test("connects practical chapters to Workshop and deeper mechanics", () => {
    for (const [bookId, kind] of [
      ["constructs", "construct"],
      ["activities", "activity"],
      ["spells", "spell"],
    ]) {
      const chapter = LIBRARY_COPY.books
        .find((book) => book.id === bookId)
        ?.chapters.find((candidate) => candidate.id === "test");
      expect(chapter?.links.map((link) => link.href)).toContain(
        `/workshop?kind=${kind}`,
      );
      expect(
        chapter?.links.some((link) =>
          link.href.startsWith("/library/model-context#"),
        ),
      ).toBe(true);
    }
    const gettingStarted = LIBRARY_COPY.books.find(
      (book) => book.id === "getting-started",
    );
    expect(
      gettingStarted?.chapters.flatMap((chapter) =>
        chapter.links.map((link) => link.href),
      ),
    ).toEqual(
      expect.arrayContaining(["/projects", "/workshop", "/marketplace"]),
    );
  });

  test("keeps every model call site discoverable in the source map", () => {
    const calls = Object.entries(SOURCES).filter(
      ([, text]) => MODEL_CALL.test(text) || IMAGE_PROVIDER_IMPORT.test(text),
    );
    expect(calls.length).toBeGreaterThan(0);
    for (const [file] of calls) {
      expect(SOURCE_MAP, `Document model inputs for ${file}`).toContain(
        `\`${file.slice("/src/".length)}\``,
      );
    }
  });

  test("keeps source references and reading destinations reachable", () => {
    const sourceTable =
      SOURCE_MAP.split("## Source map")[1]?.split("## Review and checks")[0] ??
      "";
    expect(sourceTable).not.toBe("");
    for (const match of sourceTable.matchAll(SOURCE_PATH)) {
      const { path: captured = "" } = match.groups ?? {};
      const path = captured.replace("apps/web/src/", "");
      expect(
        Object.keys(SOURCES).some(
          (file) => file === `/src/${path}` || file.startsWith(`/src/${path}`),
        ),
        path,
      ).toBe(true);
    }
    for (const book of LIBRARY_COPY.books) {
      const destinations = [
        book.action,
        ...book.chapters.flatMap((chapter) => chapter.links),
      ];
      for (const { href } of destinations) {
        expect(destinationExists(href), href).toBe(true);
      }

      expect(new Set(book.chapters.map((chapter) => chapter.id)).size).toBe(
        book.chapters.length,
      );
    }
  });
});
