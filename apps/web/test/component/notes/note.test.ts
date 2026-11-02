// How a note is kept in a project's memory: written as a paragraph of its
// own at the memory's end, found again among the memory's other text, and
// taken out without disturbing the rest. The store's part, in the test
// database, is the server tests'.
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  LISTED_NOTE_TEXT,
  NOTE_DAY,
  NOTE_MAX_LENGTH,
  NOTE_TEXT,
  noteDay,
  notesIn,
  withNote,
  withoutNote,
} from "@/notes/note.ts";

// A listed note as the delete form sends it back.
const LISTED_NOTE = z.object({ day: NOTE_DAY, text: LISTED_NOTE_TEXT });

const SHELL = { day: NOTE_DAY.parse("2026-11-02"), text: "try a cage" };
const EYES = { day: NOTE_DAY.parse("2026-11-03"), text: "glass eyes" };

// The text an outcome holds, or a failure.
function textOf(outcome: ReturnType<typeof withNote>): string {
  if (outcome.kind === "failed") {
    throw new Error(`The change failed: ${outcome.reason}`);
  }
  return outcome.text;
}

describe("a note in the memory", () => {
  test("is added at the end, as a paragraph of its own, and found again", () => {
    const memory = textOf(
      withNote(textOf(withNote("# Goal\n\nA sea turtle", SHELL)), EYES),
    );

    expect(memory).toBe(
      "# Goal\n\nA sea turtle\n\nNote (2026-11-02): try a cage\n\nNote (2026-11-03): glass eyes",
    );
    expect(notesIn(memory)).toEqual([EYES, SHELL]);
  });

  test("is the first paragraph of an empty memory", () => {
    expect(textOf(withNote("", SHELL))).toBe("Note (2026-11-02): try a cage");
  });

  test("written by hand or in a list is a note only as its own line", () => {
    expect(
      notesIn(
        "Note (2026-11-02): by hand\n- Note (2026-11-03): in a list\nNote (soon): undated",
      ),
    ).toEqual([{ day: "2026-11-02", text: "by hand" }]);
  });

  test("is taken out with its blank line, leaving the rest as it was", () => {
    const memory = textOf(withNote(textOf(withNote("# Goal", SHELL)), EYES));

    expect(textOf(withoutNote(memory, SHELL))).toBe(
      "# Goal\n\nNote (2026-11-03): glass eyes",
    );
    expect(textOf(withoutNote(memory, EYES))).toBe(
      "# Goal\n\nNote (2026-11-02): try a cage",
    );
    expect(textOf(withoutNote(textOf(withNote("", SHELL)), SHELL))).toBe("");
  });

  test("taken out twice when it was there twice leaves none", () => {
    const twice = textOf(withNote(textOf(withNote("", SHELL)), SHELL));
    const once = textOf(withoutNote(twice, SHELL));

    expect(notesIn(once)).toEqual([SHELL]);
    expect(notesIn(textOf(withoutNote(once, SHELL)))).toEqual([]);
  });

  test("listed as it was written, however it was spaced or however long, can be taken out", () => {
    const spaced = "try  a   cage";
    const long = "x".repeat(NOTE_MAX_LENGTH + 1);
    const memory = `# Goal\n\nNote (2026-11-02): ${spaced}\n\nNote (2026-11-03): ${long}`;
    const listed = notesIn(memory);
    expect(listed.map(({ text }) => text)).toEqual([long, spaced]);

    const withoutBoth = listed.reduce(
      (text, note) => textOf(withoutNote(text, LISTED_NOTE.parse(note))),
      memory,
    );
    expect(withoutBoth).toBe("# Goal");
  });

  test("that isn't there can't be taken out", () => {
    expect(withoutNote("# Goal", SHELL)).toEqual({
      kind: "failed",
      reason: "missing",
    });
  });
});

describe("a note's text", () => {
  test("is tidied to one line", () => {
    expect(NOTE_TEXT.parse("  try a\r\n\tsubdivision   cage  ")).toBe(
      "try a subdivision cage",
    );
  });

  test("is refused when empty or too long", () => {
    expect(NOTE_TEXT.safeParse(" \n ").success).toBe(false);
    expect(NOTE_TEXT.safeParse("x".repeat(NOTE_MAX_LENGTH)).success).toBe(true);
    expect(NOTE_TEXT.safeParse("x".repeat(NOTE_MAX_LENGTH + 1)).success).toBe(
      false,
    );
  });
});

describe("a listed note's text, as a delete sends it", () => {
  test("is taken as it is, one line with no space at either end", () => {
    expect(LISTED_NOTE_TEXT.parse("try  a cage")).toBe("try  a cage");
    expect(LISTED_NOTE_TEXT.safeParse("x").success).toBe(true);
    expect(LISTED_NOTE_TEXT.safeParse("").success).toBe(false);
    expect(LISTED_NOTE_TEXT.safeParse(" try").success).toBe(false);
    expect(LISTED_NOTE_TEXT.safeParse("try\nmore").success).toBe(false);
  });
});

describe("a note's day", () => {
  const Now = new Date("2026-11-02T23:30:00Z");

  test("is the browser's day when it is within a day of UTC's", () => {
    expect(noteDay("2026-11-02", Now)).toBe("2026-11-02");
    expect(noteDay("2026-11-03", Now)).toBe("2026-11-03");
    expect(noteDay("2026-11-01", Now)).toBe("2026-11-01");
  });

  test("is UTC's day when the browser's is missing, malformed or far off", () => {
    expect(noteDay(undefined, Now)).toBe("2026-11-02");
    expect(noteDay("soon", Now)).toBe("2026-11-02");
    expect(noteDay("2026-11-31", new Date("2026-11-30T23:00:00Z"))).toBe(
      "2026-11-30",
    );
    expect(noteDay("2025-11-02", Now)).toBe("2026-11-02");
  });
});
