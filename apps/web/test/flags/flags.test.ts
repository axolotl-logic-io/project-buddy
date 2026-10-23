/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { FLAG_IDS } from "@/flags/flags.ts";

// The stylesheets that hide the extras: extras.css for the elements, and
// contract.css for the theme's page decoration, which belongs to <body>.
const HIDING_STYLESHEETS = Object.values(
  import.meta.glob<string>(["./extras.css", "../themes/contract.css"], {
    base: "/src/flags",
    query: "?raw",
    import: "default",
    eager: true,
  }),
).join("\n");

// The components' sources, by path relative to src/flags/.
const COMPONENT_SOURCES = import.meta.glob<string>("../**/*.tsx", {
  base: "/src/flags",
  query: "?raw",
  import: "default",
  eager: true,
});

const COMMENT = /\/\*[\s\S]*?\*\//gu;
// A rule's selector that applies while <html> hides a flag.
const HIDE_SELECTOR = /html\[data-hide~="(?<id>[^"]*)"\]/gu;
// Any flag id the stylesheets name: in data-hide, or on an extra's root.
const NAMED_FLAG = /\[data-(?:hide~|extra)="(?<id>[^"]*)"\]/gu;
// A flag id on an extra's root, in a rule's selector.
const NAMED_FLAG_ON_EXTRA = /\[data-extra="(?<id>[^"]*)"\]/gu;
// A flag's id where a component tags an extra with it.
const EXTRA_TAG_CALL = /extraTag\("(?<id>[^"]*)"\)/gu;
// The tag's attribute written out by hand, as in a JSX attribute.
const HAND_WRITTEN_TAG = /data-extra=/u;
// This directory's files, which alone may name the attribute.
const FLAGS_DIRECTORY = /^\.\.\/flags\//u;

function idsIn(css: string, pattern: RegExp): string[] {
  return [...css.replace(COMMENT, "").matchAll(pattern)].map((match) => {
    const { id = "" } = match.groups ?? {};
    return id;
  });
}

describe("the hiding stylesheets", () => {
  test("hide every flag", () => {
    const hidden = new Set(idsIn(HIDING_STYLESHEETS, HIDE_SELECTOR));

    expect(FLAG_IDS.filter((id) => !hidden.has(id))).toEqual([]);
  });

  test("name only flags", () => {
    const known = new Set<string>(FLAG_IDS);

    expect(
      idsIn(HIDING_STYLESHEETS, NAMED_FLAG).filter((id) => !known.has(id)),
    ).toEqual([]);
  });
});

describe("extraTag", () => {
  test("tags an extra in a component for every flag whose rule hides a tagged element (*.test.tsx not read)", () => {
    const tagged = new Set(
      Object.values(COMPONENT_SOURCES).flatMap((source) =>
        [...source.matchAll(EXTRA_TAG_CALL)].map((match) => {
          const { id = "" } = match.groups ?? {};
          return id;
        }),
      ),
    );
    const hidesTagged = new Set(idsIn(HIDING_STYLESHEETS, NAMED_FLAG_ON_EXTRA));

    expect(hidesTagged.size).toBeGreaterThan(0);
    expect([...hidesTagged].filter((id) => !tagged.has(id))).toEqual([]);
  });

  test("is how components outside src/flags/ tag an extra, never data-extra= by hand (*.test.tsx not read)", () => {
    const handWritten = Object.entries(COMPONENT_SOURCES)
      .filter(
        ([path, source]) =>
          !FLAGS_DIRECTORY.test(path) && HAND_WRITTEN_TAG.test(source),
      )
      .map(([path]) => path);

    expect(Object.keys(COMPONENT_SOURCES).length).toBeGreaterThan(0);
    expect(handWritten).toEqual([]);
  });
});
