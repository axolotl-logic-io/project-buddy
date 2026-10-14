/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import {
  DEFAULT_HIDDEN_FLAGS,
  extraTag,
  FLAG_IDS,
  FLAGS,
  hiddenFromSwitched,
  knownFlags,
  switchedFromHidden,
} from "@/flags/flags.ts";
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

// The components' sources, without their unit tests, which find extras by
// the attribute rather than tag them: by path, relative to this directory.
const COMPONENT_SOURCES = import.meta.glob<string>(
  ["../**/*.tsx", "!../**/*.test.tsx"],
  { query: "?raw", import: "default", eager: true },
);

const COMMENT = /\/\*[\s\S]*?\*\//gu;
// A rule's selector that applies while <html> hides a flag.
const HIDE_SELECTOR = /html\[data-hide~="(?<id>[^"]*)"\]/gu;
// Any flag id the stylesheets name: in data-hide, or on an extra's root.
const NAMED_FLAG = /\[data-(?:hide~|extra)="(?<id>[^"]*)"\]/gu;
// A flag id on an extra's root, in a rule's selector.
const NAMED_FLAG_ON_EXTRA = /\[data-extra="(?<id>[^"]*)"\]/gu;
const KEBAB_CASE = /^[a-z]+(?:-[a-z]+)*$/u;
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

  test("hides only the persona mechanics and interview persona until the user switches them on", () => {
    expect(DEFAULT_HIDDEN_FLAGS).toEqual([
      "persona-mechanics",
      "interview-persona",
    ]);
    expect(
      FLAGS.filter(
        ({ id }) => id !== "persona-mechanics" && id !== "interview-persona",
      ).every(({ defaultOn }) => defaultOn),
    ).toBe(true);
  });
});

describe("hiddenFromSwitched and switchedFromHidden", () => {
  test("with nothing switched, hide only the flags off by default", () => {
    expect(hiddenFromSwitched([])).toEqual([
      "persona-mechanics",
      "interview-persona",
    ]);
    expect(
      switchedFromHidden(["persona-mechanics", "interview-persona"]),
    ).toEqual([]);
  });

  test("switching a flag flips it from its default", () => {
    expect(hiddenFromSwitched(["working-notes", "persona-mechanics"])).toEqual([
      "working-notes",
      "interview-persona",
    ]);
    expect(switchedFromHidden(["working-notes"])).toEqual([
      "working-notes",
      "persona-mechanics",
      "interview-persona",
    ]);
  });

  test("are each other's inverse", () => {
    for (const ids of [
      [],
      ["persona-mechanics"],
      ["tool-lines", "chat-names"],
      [...FLAG_IDS],
    ]) {
      expect(hiddenFromSwitched(switchedFromHidden(ids))).toEqual(
        knownFlags(ids),
      );
      expect(switchedFromHidden(hiddenFromSwitched(ids))).toEqual(
        knownFlags(ids),
      );
    }
  });

  test("leave out unknown ids and repeats, in the registry's order", () => {
    expect(
      hiddenFromSwitched(["tool-lines", "no-such-flag", "tool-lines"]),
    ).toEqual(["tool-lines", "persona-mechanics", "interview-persona"]);
    expect(
      switchedFromHidden(["tool-lines", "no-such-flag", "tool-lines"]),
    ).toEqual(["tool-lines", "persona-mechanics", "interview-persona"]);
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

  test("returns the attribute that the hiding rules select on", () => {
    expect(extraTag("tool-lines")).toEqual({ "data-extra": "tool-lines" });
  });
});
