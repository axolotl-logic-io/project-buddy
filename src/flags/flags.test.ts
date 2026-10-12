/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { DEFAULT_HIDDEN_FLAGS, FLAG_IDS, FLAGS } from "@/flags/flags.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";

// The stylesheets that hide the extras: extras.css for the elements, and
// contract.css for the theme's page decoration, which belongs to <body>.
const HIDING_STYLESHEETS = Object.values(
  import.meta.glob<string>(["./extras.css", "../themes/contract.css"], {
    query: "?raw",
    import: "default",
    eager: true,
  }),
).join("\n");

const COMMENT = /\/\*[\s\S]*?\*\//gu;
// A rule's selector that applies while <html> hides a flag.
const HIDE_SELECTOR = /html\[data-hide~="(?<id>[^"]*)"\]/gu;
// Any flag id the stylesheets name: in data-hide, or on an extra's root.
const NAMED_FLAG = /\[data-(?:hide~|extra|extra-fallback)="(?<id>[^"]*)"\]/gu;
const KEBAB_CASE = /^[a-z]+(?:-[a-z]+)*$/u;

function idsIn(css: string, pattern: RegExp): string[] {
  return [...css.replace(COMMENT, "").matchAll(pattern)].map((match) => {
    const { id = "" } = match.groups ?? {};
    return id;
  });
}

describe("FLAGS", () => {
  test("lists each extra once, by a kebab-case id", () => {
    expect(new Set(FLAG_IDS).size).toBe(FLAGS.length);
    for (const id of FLAG_IDS) {
      expect(id).toMatch(KEBAB_CASE);
    }
  });

  test("names copy that exists for every flag, and every entry of the copy is a flag's", () => {
    const copyKeys = FLAGS.map(({ copyKey }) => copyKey);

    expect(copyKeys).toHaveLength(Object.keys(FLAG_COPY).length);
    expect(new Set(copyKeys)).toEqual(new Set(Object.keys(FLAG_COPY)));
  });

  test("shows every extra until the user hides it", () => {
    expect(FLAGS.every(({ defaultOn }) => defaultOn)).toBe(true);
    expect(DEFAULT_HIDDEN_FLAGS).toEqual([]);
  });
});

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
