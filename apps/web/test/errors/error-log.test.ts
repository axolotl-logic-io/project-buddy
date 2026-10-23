/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";

// Every module in src/errors/, and its tests in test/errors/, as text.
const ERRORS_SOURCES = import.meta.glob<string>(
  ["/src/errors/*.ts", "/test/errors/*.ts"],
  { query: "?raw", import: "default", eager: true },
);

const TUTOR_IMPORT = /from "@\/tutor\//u;

describe("the errors folder", () => {
  // Every store and error path imports the error log, so the tutor passes it
  // facts about a reply rather than the log knowing the tutor's tools.
  test("imports nothing from the tutor", () => {
    const files = Object.keys(ERRORS_SOURCES);
    const importers = files.filter((file) =>
      TUTOR_IMPORT.test(ERRORS_SOURCES[file] ?? ""),
    );

    expect(files).toContain("/src/errors/error-log.ts");
    expect(importers).toEqual([]);
  });
});
