// Port of docutils.nodes.make_id (docutils 0.22.4, used by the manual's
// Sphinx 9.1 build). Sphinx derives the HTML id of a section from its title
// and the id of an explicit label (`.. _bpy.ops.mesh.bevel:`) from the label
// name, both through this function.
const DIGRAPHS: Record<string, string> = {
  ß: "sz",
  æ: "ae",
  œ: "oe",
  ȸ: "db",
  ȹ: "qp",
};

// Letters that NFKD does not decompose to ASCII, such as "o with stroke".
const LETTERS: Record<string, string> = Object.fromEntries(
  [..."øđħıłŧƀƃƈƌƒƙƚƞƥƫƭƴƶǥȥȴȵȶȷȼȿɀɇɉɋɍɏ"].map((letter, index) => [
    letter,
    "odhiltbbcdfklnpttyzgzlntjcszejqry"[index],
  ]),
);

export function makeSphinxId(name: string): string {
  const transliterated = [...name.toLowerCase()]
    .map((char) => DIGRAPHS[char] ?? LETTERS[char] ?? char)
    .join("");
  const ascii = transliterated.normalize("NFKD").replace(/[^\p{ASCII}]/gu, "");
  return ascii
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[-0-9]+|-+$/g, "");
}

const INLINE_MARKUP =
  /``(.+?)``|(?::([\w.+-]+):)?`((?:[^`\\]|\\.)+?)`(?:__?)?|\*\*(.+?)\*\*|\*(.+?)\*/g;

// Plain text of an RST heading, as docutils sees it after parsing inline
// markup. References keep only their explicit title (`Title <target>`), and
// the manual's `bl-icon` role renders an image with no text.
export function rstInlineToText(rst: string): string {
  return rst
    .replace(
      INLINE_MARKUP,
      (_match, literal, role, interpreted, strong, emphasis) => {
        if (role === "bl-icon") return "";
        return (
          literal ??
          interpreted?.replace(/^([\s\S]*?)\s*<[^<>]+>$/, "$1") ??
          strong ??
          emphasis
        );
      },
    )
    .replace(/\\(.)/g, "$1")
    .trim();
}
