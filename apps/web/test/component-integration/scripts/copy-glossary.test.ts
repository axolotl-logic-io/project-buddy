import { describe, expect, test } from "vitest";
import glossary from "../../../../../GLOSSARY.md?raw";
import {
  copyDefinitions,
  definitionsCsv,
} from "../../../scripts/copy-glossary.ts";
import type { CopySheetField } from "../../../scripts/copy-sheet.ts";

function field(description: string, identifier = "FOO.bar"): CopySheetField {
  return { identifier, description, words: 4, placeholders: [] };
}

describe("writer definitions", (): void => {
  test("finds names and plural forms, and explains terms needed by the definitions", (): void => {
    const definitions = copyDefinitions(
      [field("Explain a QUICK NOTE saved to quests.")],
      glossary,
    );
    const terms = definitions.map((entry): string => entry.term);
    expect(terms).toContain("Quick Note");
    expect(terms).toContain("Quest");
    expect(terms).toContain("Construct");
    expect(terms).toContain("Tasks");
    expect(terms).toContain("Project Buddy");
    expect(terms).not.toContain("External agent");
    expect(new Set(terms).size).toBe(terms.length);
  });

  test("recognizes terms within copy identifiers", (): void => {
    const terms = copyDefinitions(
      [field("Explain what happened.", "QUICK_NOTE_COPY.failed")],
      glossary,
    ).map((entry): string => entry.term);
    expect(terms).toContain("Quick Note");
  });

  test("matches complete words rather than pieces of unrelated words", (): void => {
    expect(
      copyDefinitions([field("forecast spellbound tasksmith")], glossary),
    ).toEqual([]);
    expect(copyDefinitions([], glossary)).toEqual([]);
  });

  test("requires an explanation when the glossary gains a term", (): void => {
    expect((): unknown =>
      copyDefinitions([], `${glossary}\n### Unexplained feature\n`),
    ).toThrow("Add a plain-language definition");
  });

  test("writes a separate importable sheet with quoted definitions", (): void => {
    expect(
      definitionsCsv([
        {
          term: "Quest",
          definition: 'Something to do, make or learn.\nShown under "Quests".',
        },
      ]),
    ).toBe(
      '"Term","Definition"\r\n"Quest","Something to do, make or learn.\nShown under ""Quests""."\r\n',
    );
  });
});
