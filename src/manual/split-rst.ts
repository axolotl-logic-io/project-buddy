import { makeSphinxId, rstInlineToText } from "./sphinx-id.ts";

export type RstSection = {
  title: string;
  anchor: string;
  text: string;
};

// A line made of one repeated punctuation character, such as "=====".
const ADORNMENT = /^([!-/:-@[-`{-~])\1*\s*$/;
// An explicit target at the start of a line, such as ".. _bpy.ops.mesh.bevel:".
const LABEL = /^\.\. _([^:`]+|`[^`]+`):\s*$/;
// Explicit markup such as a comment or `.. index::`. A label followed only by
// these lines still marks the place where the next heading starts.
const EXPLICIT_MARKUP = /^\.\.(\s|$)/;

function isBlank(line: string | undefined): boolean {
  return !line?.trim();
}

// The heading starting at lines[index], with the number of lines it spans.
function readHeading(
  lines: string[],
  index: number,
): { title: string; style: string; lineCount: number } | undefined {
  const [first, second, third] = lines.slice(index, index + 3);
  if (
    ADORNMENT.test(first) &&
    !isBlank(second) &&
    !ADORNMENT.test(second) &&
    third?.trimEnd() === first.trimEnd()
  ) {
    return { title: second.trim(), style: `over${first[0]}`, lineCount: 3 };
  }
  // docutils accepts an underline shorter than the title only from 4 chars.
  const underline = second?.trimEnd() ?? "";
  if (
    !isBlank(first) &&
    !/^\s/.test(first) &&
    !ADORNMENT.test(first) &&
    ADORNMENT.test(underline) &&
    (underline.length >= 4 || underline.length >= first.trimEnd().length)
  ) {
    return { title: first.trim(), style: underline[0], lineCount: 2 };
  }
  return undefined;
}

// Splits an RST document into one section per heading, at any level. Text
// before the first heading is dropped, and so are labels at the start of a
// line. Each anchor is an HTML id Sphinx gives the section: the id of its
// title, or of its label when an earlier section already used that id.
// Sphinx numbers a repeated title without a label from a counter shared with
// other generated ids, so such a section is anchored at its parent heading.
export function splitRstSections(rst: string): RstSection[] {
  const lines = rst.replace(/\r\n?/g, "\n").split("\n");
  const sections: {
    title: string;
    anchor: string;
    level: number;
    body: string[];
  }[] = [];
  // Heading styles in order of first use; a style's index is its level.
  const styles: string[] = [];
  const usedIds = new Set<string>();
  let labels: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const heading = isBlank(lines[index - 1])
      ? readHeading(lines, index)
      : undefined;
    if (heading) {
      const title = rstInlineToText(heading.title);
      const labelIds = labels.map(makeSphinxId);
      for (const id of labelIds) usedIds.add(id);
      const titleId = makeSphinxId(title);
      if (!styles.includes(heading.style)) styles.push(heading.style);
      const level = styles.indexOf(heading.style);
      const parent = sections.findLast((section) => section.level < level);
      const anchor =
        titleId && !usedIds.has(titleId)
          ? titleId
          : (labelIds[0] ?? parent?.anchor ?? "");
      usedIds.add(titleId);
      sections.push({ title, anchor, level, body: [] });
      labels = [];
      index += heading.lineCount - 1;
      continue;
    }
    const label = LABEL.exec(line);
    if (label) {
      labels.push(label[1].replace(/^`|`$/g, ""));
      continue;
    }
    if (!isBlank(line) && !EXPLICIT_MARKUP.test(line)) {
      for (const id of labels.map(makeSphinxId)) usedIds.add(id);
      labels = [];
    }
    sections.at(-1)?.body.push(line);
  }

  return sections.map(({ title, anchor, body }) => ({
    title,
    anchor,
    text: body
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  }));
}
