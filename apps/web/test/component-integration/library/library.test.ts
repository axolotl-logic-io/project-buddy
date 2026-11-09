/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import SOURCE_MAP from "../../../../../docs/library.md?raw";
import { LIBRARY_COPY } from "../../../src/ui/copy/library.ts";

const SOURCES = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});
const MODEL_CALL =
  /\b(?:generateText|streamText|generateImage|embed|embedMany)\s*\(/u;
const SOURCE_PATH = /`(?<path>[a-z][a-z0-9-/]*(?:\.tsx?|\/))`/gu;

describe("Library maintenance", () => {
  test("keeps every model call site discoverable in the source map", () => {
    const calls = Object.entries(SOURCES).filter(([, text]) =>
      MODEL_CALL.test(text),
    );
    expect(calls.length).toBeGreaterThan(0);
    for (const [file] of calls) {
      expect(SOURCE_MAP, `Document model inputs for ${file}`).toContain(
        `\`${file.slice("/src/".length)}\``,
      );
    }
  });

  test("keeps source references and reading destinations reachable", () => {
    for (const match of SOURCE_MAP.matchAll(SOURCE_PATH)) {
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
      const action = `/src/app/(workspace)${book.action.href}`;
      expect(
        Object.keys(SOURCES).some(
          (file) =>
            file === `${action}/page.tsx` ||
            file === `${action}/(list)/page.tsx`,
        ),
        book.action.href,
      ).toBe(true);
      expect(new Set(book.chapters.map((chapter) => chapter.id)).size).toBe(
        book.chapters.length,
      );
    }
  });
});
