// Port of docutils.nodes.make_id (docutils 0.22.4, used by the manual's
// Sphinx 9.1 build). Sphinx derives the HTML id of a section from its title
// and the id of an explicit label (`.. _bpy.ops.mesh.bevel:`) from the label
// name, both through this function.
const DIGRAPHS: ReadonlyMap<string, string> = new Map([
  ["ß", "sz"],
  ["æ", "ae"],
  ["œ", "oe"],
  ["ȸ", "db"],
  ["ȹ", "qp"],
]);

// Letters that NFKD does not decompose to ASCII, such as "o with stroke".
const LETTERS: ReadonlyMap<string, string> = new Map([
  ["ø", "o"],
  ["đ", "d"],
  ["ħ", "h"],
  ["ı", "i"],
  ["ł", "l"],
  ["ŧ", "t"],
  ["ƀ", "b"],
  ["ƃ", "b"],
  ["ƈ", "c"],
  ["ƌ", "d"],
  ["ƒ", "f"],
  ["ƙ", "k"],
  ["ƚ", "l"],
  ["ƞ", "n"],
  ["ƥ", "p"],
  ["ƫ", "t"],
  ["ƭ", "t"],
  ["ƴ", "y"],
  ["ƶ", "z"],
  ["ǥ", "g"],
  ["ȥ", "z"],
  ["ȴ", "l"],
  ["ȵ", "n"],
  ["ȶ", "t"],
  ["ȷ", "j"],
  ["ȼ", "c"],
  ["ȿ", "s"],
  ["ɀ", "z"],
  ["ɇ", "e"],
  ["ɉ", "j"],
  ["ɋ", "q"],
  ["ɍ", "r"],
  ["ɏ", "y"],
]);

const NON_ASCII = /[^\p{ASCII}]/gu;
const WHITESPACE_RUN = /\s+/u;
const NON_ID_CHARACTERS = /[^a-z0-9]+/gu;
const UNUSABLE_ID_EDGES = /^[-0-9]+|-+$/gu;

const INLINE_MARKUP =
  /``(?<literal>.+?)``|(?::(?<role>[\w.+-]+):)?`(?<interpreted>(?:[^`\\]|\\.)+?)`(?:__?)?|\*\*(?<strong>.+?)\*\*|\*(?<emphasis>.+?)\*/gu;
// A reference with an explicit title, such as `Title <target>`.
const EXPLICIT_TITLE = /^(?<title>[\s\S]*?)\s*<[^<>]+>$/u;
const BACKSLASH_ESCAPE = /\\(?<escaped>.)/gu;

// The text docutils keeps from one piece of inline markup.
function inlineMarkupText({
  literal,
  role,
  interpreted,
  strong,
  emphasis,
}: Readonly<Partial<Record<string, string>>>): string {
  if (role === "bl-icon") {
    return "";
  }
  return (
    literal ??
    interpreted?.replace(EXPLICIT_TITLE, "$<title>") ??
    strong ??
    emphasis ??
    ""
  );
}

export function makeSphinxId(name: string): string {
  const transliterated = [...name.toLowerCase()]
    .map((char) => DIGRAPHS.get(char) ?? LETTERS.get(char) ?? char)
    .join("");
  const ascii = transliterated.normalize("NFKD").replace(NON_ASCII, "");
  return ascii
    .split(WHITESPACE_RUN)
    .filter(Boolean)
    .join(" ")
    .replace(NON_ID_CHARACTERS, "-")
    .replace(UNUSABLE_ID_EDGES, "");
}

// Plain text of an RST heading, as docutils sees it after parsing inline
// markup. References keep only their explicit title (`Title <target>`), and
// the manual's `bl-icon` role renders an image with no text.
export function rstInlineToText(rst: string): string {
  let text = "";
  let end = 0;
  for (const match of rst.matchAll(INLINE_MARKUP)) {
    text += rst.slice(end, match.index) + inlineMarkupText(match.groups ?? {});
    end = match.index + match[0].length;
  }
  text += rst.slice(end);
  return text.replace(BACKSLASH_ESCAPE, "$<escaped>").trim();
}
