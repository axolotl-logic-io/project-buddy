// A Zotero note as Project Buddy shows and writes it. Zotero keeps a note
// as HTML. Project Buddy writes plain text as one paragraph a line, and
// lets someone edit a note here only while it is still that plain: a note
// with any other formatting shows as its text, to edit in Zotero.
import { decoded } from "./works-cited.ts";

// Zotero's wrapper around a note it saved: a div naming its note schema.
const SCHEMA_WRAPPER =
  /^\s*<div\s+data-schema-version="\d+"\s*>(?<inner>[\s\S]*)<\/div>\s*$/u;
// A note of plain paragraphs: nothing but <p> elements holding text.
const PLAIN_NOTE = /^(?:\s*<p>[^<]*<\/p>)*\s*$/u;
const PARAGRAPH = /<p>(?<text>[^<]*)<\/p>/gu;
// Where formatted HTML breaks a line.
const LINE_BREAK = /<br\s*\/?>/giu;
const BLOCK_END = /<\/(?:p|div|h[1-6]|li|blockquote|pre|tr|table|ul|ol)\s*>/giu;
const ANY_TAG = /<[^>]*>/gu;
const NEWLINE = /\r\n?|[\u2028\u2029]/gu;
const BLANK_LINES = /\n{3,}/gu;
const TRAILING_SPACE = /[ \t]+\n/gu;

const ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
const ESCAPED = /[&<>"]/gu;

function escaped(text: string): string {
  return text.replace(ESCAPED, (mark: string): string => ESCAPES[mark] ?? mark);
}

// The longest note Project Buddy writes, in characters.
const NOTE_MAX = 4000;

// The note's text with its lines in Project Buddy's form: \n between
// lines, no space at a line's end, and at most one blank line in a row.
function tidyNote(text: string): string {
  return text
    .replace(NEWLINE, "\n")
    .replace(TRAILING_SPACE, "\n")
    .replace(BLANK_LINES, "\n\n")
    .trim();
}

// The HTML Project Buddy writes for a note's text: a paragraph a line.
function noteHtml(text: string): string {
  return tidyNote(text)
    .split("\n")
    .map((line) => `<p>${escaped(line)}</p>`)
    .join("");
}

// What a note's HTML says, and whether it is plain enough to edit here.
function noteFromHtml(html: string): {
  readonly text: string;
  readonly plain: boolean;
} {
  const { inner = html } = SCHEMA_WRAPPER.exec(html)?.groups ?? {};
  if (PLAIN_NOTE.test(inner)) {
    const lines = Array.from(inner.matchAll(PARAGRAPH), (match) => {
      const { text = "" } = match.groups ?? {};
      return decoded(text);
    });
    return { text: tidyNote(lines.join("\n")), plain: true };
  }
  const text = decoded(
    inner
      .replace(LINE_BREAK, "\n")
      .replace(BLOCK_END, "\n")
      .replace(ANY_TAG, ""),
  );
  return { text: tidyNote(text), plain: false };
}

export { NOTE_MAX, noteFromHtml, noteHtml, tidyNote };
