// Zotero's formatted bibliography entries as Project Buddy shows them: plain
// runs of text, italic or not, in Works Cited order. Zotero sends each entry
// as HTML; nothing of that HTML but its text and italics reaches a page.
import type { EntryRun, WorksCitedEntry } from "./zotero.ts";

const TAG = /<(?<closing>\/?)(?<name>[a-z][a-z0-9]*)(?<attributes>[^>]*)>/giu;
const ENTITY = /&(?<name>#x[\da-f]+|#\d+|[a-z]+);/giu;
const SPACES = /\s+/gu;
const ITALIC_STYLE = /font-style\s*:\s*italic/iu;
const NORMAL_STYLE = /font-style\s*:\s*normal/iu;
// What a Works Cited list skips at the start of an entry when it orders
// entries: opening quotation marks and brackets, then an English article.
const OPENING_MARKS = /^[\s"'“‘«([]+/u;
const LEADING_ARTICLE = /^(?:the|an|a)\s+/iu;
// The highest Unicode code point.
const HIGHEST_CODE_POINT = 0x10_ff_ff;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

// Tags that hold nothing, so they open no level of italics.
const EMPTY_TAGS: ReadonlySet<string> = new Set(["br", "hr", "img", "wbr"]);
const ITALIC_TAGS: ReadonlySet<string> = new Set(["i", "em", "cite"]);

function decoded(text: string): string {
  return text.replace(ENTITY, (whole: string, name: string): string => {
    const lower = name.toLowerCase();
    let code: number | undefined;
    if (lower.startsWith("#x")) {
      code = Number.parseInt(lower.slice(2), 16);
    } else if (lower.startsWith("#")) {
      code = Number.parseInt(lower.slice(1), 10);
    } else {
      return NAMED_ENTITIES[lower] ?? whole;
    }
    if (code > HIGHEST_CODE_POINT) {
      return whole;
    }
    return String.fromCodePoint(code);
  });
}

// Whether text inside the tag is italic, given whether text around it is.
function italicInside(
  name: string,
  attributes: string,
  around: boolean,
): boolean {
  if (ITALIC_TAGS.has(name)) {
    return true;
  }
  if (ITALIC_STYLE.test(attributes)) {
    return true;
  }
  if (NORMAL_STYLE.test(attributes)) {
    return false;
  }
  return around;
}

// Runs with each stretch of white space made one space, with none at either
// end, empty runs dropped and neighbouring runs of one kind joined.
function tidied(runs: readonly EntryRun[]): WorksCitedEntry {
  const tidy: EntryRun[] = [];
  for (const run of runs) {
    let text = run.text.replace(SPACES, " ");
    const previous = tidy.at(-1);
    if (previous === undefined || previous.text.endsWith(" ")) {
      text = text.trimStart();
    }
    if (text !== "" && previous?.italic === run.italic) {
      tidy[tidy.length - 1] = { ...previous, text: previous.text + text };
    } else if (text !== "") {
      tidy.push({ text, italic: run.italic });
    }
  }
  const last = tidy.at(-1);
  if (last !== undefined) {
    const text = last.text.trimEnd();
    if (text === "") {
      tidy.pop();
    } else {
      tidy[tidy.length - 1] = { ...last, text };
    }
  }
  return tidy;
}

// The entry that Zotero's formatted HTML for one reference shows. Unknown
// tags keep their text, and block tags part words as a space would.
function entryFromBib(html: string): WorksCitedEntry {
  const runs: EntryRun[] = [];
  const italics: boolean[] = [false];
  let at = 0;
  for (const match of html.matchAll(TAG)) {
    const {
      closing = "",
      name: tag = "",
      attributes = "",
    } = match.groups ?? {};
    runs.push({
      text: decoded(html.slice(at, match.index)),
      italic: italics.at(-1) === true,
    });
    at = match.index + match[0].length;
    const name = tag.toLowerCase();
    if (name === "div" || name === "p" || name === "br") {
      runs.push({ text: " ", italic: italics.at(-1) === true });
    }
    const empty = EMPTY_TAGS.has(name) || attributes.trimEnd().endsWith("/");
    if (!empty && closing === "/" && italics.length > 1) {
      italics.pop();
    } else if (!empty && closing === "") {
      italics.push(italicInside(name, attributes, italics.at(-1) === true));
    }
  }
  runs.push({ text: decoded(html.slice(at)), italic: italics.at(-1) === true });
  return tidied(runs);
}

// The entry's text without its italics.
function plainText(entry: WorksCitedEntry): string {
  return entry.map(({ text }) => text).join("");
}

const COLLATOR = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

function sortText(entry: WorksCitedEntry): string {
  return plainText(entry)
    .replace(OPENING_MARKS, "")
    .replace(LEADING_ARTICLE, "");
}

// The references in Works Cited order: alphabetical by their entries'
// opening words, which are the author's name or, for a work with none, its
// title without a leading article. Entries that read alike keep an order
// by their Zotero keys, so every sync gives one order.
function inWorksCitedOrder<
  Reference extends { readonly entry: WorksCitedEntry; readonly key: string },
>(references: readonly Reference[]): Reference[] {
  const keyed = references.map((reference) => ({
    reference,
    text: sortText(reference.entry),
  }));
  keyed.sort(
    (first, second) =>
      COLLATOR.compare(first.text, second.text) ||
      COLLATOR.compare(
        plainText(first.reference.entry),
        plainText(second.reference.entry),
      ) ||
      first.reference.key.localeCompare(second.reference.key),
  );
  return keyed.map(({ reference }) => reference);
}

// Whether the entry's text holds the search, ignoring case and the
// search's surrounding spaces.
function entryHolds(entry: WorksCitedEntry, search: string): boolean {
  return plainText(entry)
    .toLocaleLowerCase()
    .includes(search.trim().toLocaleLowerCase());
}

export { entryFromBib, entryHolds, inWorksCitedOrder, plainText };
