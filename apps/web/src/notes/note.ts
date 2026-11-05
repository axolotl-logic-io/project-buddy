// What a note is: a short line the user drops into a project's memory
// between chats, with the day they wrote it. A note lives in the memory's
// text as a paragraph of its own, so the construct reads it with the rest of the
// memory; how that paragraph is written is decided here alone. It imports
// nothing from the server, so pages, forms and tests can use it.
import { z } from "zod";
import {
  applyMemoryEdit,
  type MemoryEditOutcome,
} from "@/memory/memory-edit.ts";

// The longest note, in characters, after its spaces are tidied. Longer
// thoughts belong in the memory page's editor or a chat.
const NOTE_MAX_LENGTH = 1000;

// A note's text: one line, with every run of spaces and line breaks made one
// space, and nothing around it.
const SPACES = /\s+/gu;

// A day as YYYY-MM-DD.
const DAY_FORM = /^\d{4}-\d{2}-\d{2}$/u;

// A note's paragraph in the memory: "Note (2026-11-02): the text".
const NOTE_PARAGRAPH = /^Note \((?<day>\d{4}-\d{2}-\d{2})\): (?<text>\S.*)$/u;

// A listed note's text: one line, with no space at either end.
const LISTED_TEXT_FORM = /^\S(?:[^\n]*\S)?$/u;

const MS_PER_DAY = 86_400_000;

// A day of the calendar, as YYYY-MM-DD. Date.parse takes days past a
// month's end, such as 2026-11-31, as days of the next month, so a day must
// come back from its instant as it went in.
const NOTE_DAY = z
  .string()
  .regex(DAY_FORM)
  .refine((day) => {
    const instant = Date.parse(day);
    return (
      !Number.isNaN(instant) && new Date(instant).toISOString().startsWith(day)
    );
  })
  .brand<"NoteDay">();

type NoteDay = z.infer<typeof NOTE_DAY>;

// A note's text as the user typed it, tidied to one line. Empty or too long
// texts are refused, with their issue's code: "too_small" or "too_big".
const NOTE_TEXT = z
  .string()
  .transform((text) => text.replace(SPACES, " ").trim())
  .pipe(z.string().min(1).max(NOTE_MAX_LENGTH));

// A note's text as notesIn lists it, for finding that note again, as a
// delete does: exactly as the memory holds it, unchanged, however it was
// written, so long as it is one line that starts and ends with a character
// other than a space.
const LISTED_NOTE_TEXT = z.string().regex(LISTED_TEXT_FORM);

interface Note {
  readonly day: NoteDay;
  readonly text: string;
}

function paragraphOf({ day, text }: Note): string {
  return `Note (${day}): ${text}`;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

// The day of the instant in the zone of whoever runs this (a browser's own),
// or in UTC.
function dayOf(instant: Date, zone: "local" | "utc"): NoteDay {
  if (zone === "utc") {
    return NOTE_DAY.parse(instant.toISOString().slice(0, "YYYY-MM-DD".length));
  }
  return NOTE_DAY.parse(
    `${instant.getFullYear()}-${twoDigits(instant.getMonth() + 1)}-${twoDigits(instant.getDate())}`,
  );
}

// The day to date a note written now: the day the user's browser sent, if it
// is a day within one of now's day in UTC, as every zone's day is, or else
// the day in UTC.
function noteDay(sent: unknown, now: Date): NoteDay {
  const utcDay = dayOf(now, "utc");
  const parsed = NOTE_DAY.safeParse(sent);
  if (
    parsed.success &&
    Math.abs(Date.parse(parsed.data) - Date.parse(utcDay)) <= MS_PER_DAY
  ) {
    return parsed.data;
  }
  return utcDay;
}

// The notes in a memory's text, newest first: every paragraph written as a
// note, whether a note saved it or the user or the construct wrote it so.
function notesIn(memoryText: string): Note[] {
  return memoryText
    .split("\n")
    .flatMap((line) => {
      const { day, text } = NOTE_PARAGRAPH.exec(line.trimEnd())?.groups ?? {};
      const parsedDay = NOTE_DAY.safeParse(day);
      if (!parsedDay.success || text === undefined) {
        return [];
      }
      return [{ day: parsedDay.data, text }];
    })
    .reverse();
}

// The memory's text with the note added at its end, as a paragraph of its
// own.
function withNote(memoryText: string, note: Note): MemoryEditOutcome {
  return applyMemoryEdit(memoryText, {
    oldText: "",
    newText: paragraphOf(note),
  });
}

// The memory's text without the note: its last paragraph that is the note,
// and the blank line that set it apart. Fails as "missing" when the text
// has no such note.
function withoutNote(memoryText: string, note: Note): MemoryEditOutcome {
  const lines = memoryText.split("\n");
  const paragraph = paragraphOf(note);
  const at = lines.findLastIndex((line) => line.trimEnd() === paragraph);
  if (at === -1) {
    return { kind: "failed", reason: "missing" };
  }
  const blankBefore = at > 0 && lines[at - 1]?.trim() === "";
  const blankAfter = at < lines.length - 1 && lines[at + 1]?.trim() === "";
  const lastLine = at === lines.length - 1;
  let start = at;
  let end = at + 1;
  if (blankAfter) {
    end += 1;
  } else if (blankBefore && lastLine) {
    start -= 1;
  }
  lines.splice(start, end - start);
  return { kind: "edited", text: lines.join("\n") };
}

export type { Note, NoteDay };
export {
  dayOf,
  LISTED_NOTE_TEXT,
  NOTE_DAY,
  NOTE_MAX_LENGTH,
  NOTE_TEXT,
  noteDay,
  notesIn,
  withNote,
  withoutNote,
};
