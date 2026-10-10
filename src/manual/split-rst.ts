import { makeSphinxId, rstInlineToText } from "./sphinx-id.ts";

interface RstHeading {
  title: string;
  style: string;
  lineCount: number;
}

interface SectionDraft {
  title: string;
  anchor: string;
  level: number;
  body: string[];
}

// What splitRstSections knows partway through a document.
interface SplitState {
  sections: SectionDraft[];
  // Heading styles in order of first use; a style's index is its level.
  styles: string[];
  usedIds: Set<string>;
  // Labels waiting for the heading they mark.
  labels: string[];
}

// A line made of one repeated punctuation character, such as "=====".
const ADORNMENT = /^(?<mark>[!-/:-@[-`{-~])\k<mark>*\s*$/u;
// An explicit target at the start of a line, such as ".. _bpy.ops.mesh.bevel:".
const LABEL = /^\.\. _(?<name>[^:`]+|`[^`]+`):\s*$/u;
const LABEL_BACKTICKS = /^`|`$/gu;
// Explicit markup such as a comment or `.. index::`. A label followed only by
// these lines still marks the place where the next heading starts.
const EXPLICIT_MARKUP = /^\.\.(?:\s|$)/u;
const LEADING_WHITESPACE = /^\s/u;
const LINE_BREAK = /\r\n?/gu;
const BLANK_LINE_RUNS = /\n{3,}/gu;

const OVERLINED_HEADING_LINES = 3;
const UNDERLINED_HEADING_LINES = 2;
// docutils accepts an underline shorter than the title only from 4 chars.
const MIN_SHORT_UNDERLINE_LENGTH = 4;

function isBlank(line: string | undefined): boolean {
  return (line ?? "").trim() === "";
}

function readOverlinedHeading(
  overline: string,
  title: string,
  underline: string | undefined,
): RstHeading | undefined {
  if (
    ADORNMENT.test(overline) &&
    !(isBlank(title) || ADORNMENT.test(title)) &&
    underline?.trimEnd() === overline.trimEnd()
  ) {
    return {
      title: title.trim(),
      style: `over${overline.charAt(0)}`,
      lineCount: OVERLINED_HEADING_LINES,
    };
  }
  return undefined;
}

function readUnderlinedHeading(
  title: string,
  underlineLine: string,
): RstHeading | undefined {
  const underline = underlineLine.trimEnd();
  if (
    !(
      isBlank(title) ||
      LEADING_WHITESPACE.test(title) ||
      ADORNMENT.test(title)
    ) &&
    ADORNMENT.test(underline) &&
    (underline.length >= MIN_SHORT_UNDERLINE_LENGTH ||
      underline.length >= title.trimEnd().length)
  ) {
    return {
      title: title.trim(),
      style: underline.charAt(0),
      lineCount: UNDERLINED_HEADING_LINES,
    };
  }
  return undefined;
}

// The heading starting at lines[index], with the number of lines it spans. A
// heading starts only after a blank line or at the top of the document.
function readHeading(
  lines: readonly string[],
  index: number,
): RstHeading | undefined {
  if (!isBlank(lines[index - 1])) {
    return undefined;
  }
  const [first = "", second = "", third] = lines.slice(
    index,
    index + OVERLINED_HEADING_LINES,
  );
  return (
    readOverlinedHeading(first, second, third) ??
    readUnderlinedHeading(first, second)
  );
}

// Labels count as used ids once something other than a heading follows them.
function retireLabels(state: SplitState): void {
  for (const id of state.labels.map(makeSphinxId)) {
    state.usedIds.add(id);
  }
  state.labels = [];
}

function sectionAnchor(
  state: SplitState,
  titleId: string,
  labelIds: readonly string[],
  level: number,
): string {
  if (titleId !== "" && !state.usedIds.has(titleId)) {
    return titleId;
  }
  const [labelId] = labelIds;
  const parent = state.sections.findLast((section) => section.level < level);
  return labelId ?? parent?.anchor ?? "";
}

function startSection(state: SplitState, heading: RstHeading): void {
  const title = rstInlineToText(heading.title);
  const labelIds = state.labels.map(makeSphinxId);
  for (const id of labelIds) {
    state.usedIds.add(id);
  }
  const titleId = makeSphinxId(title);
  if (!state.styles.includes(heading.style)) {
    state.styles.push(heading.style);
  }
  const level = state.styles.indexOf(heading.style);
  const anchor = sectionAnchor(state, titleId, labelIds, level);
  state.usedIds.add(titleId);
  state.sections.push({ title, anchor, level, body: [] });
  state.labels = [];
}

// Reads the line or heading at lines[index] into the state and returns how
// many lines it took.
function readLines(
  state: SplitState,
  lines: readonly string[],
  index: number,
): number {
  const heading = readHeading(lines, index);
  if (heading !== undefined) {
    startSection(state, heading);
    return heading.lineCount;
  }
  const line = lines[index] ?? "";
  const { name: label } = LABEL.exec(line)?.groups ?? {};
  if (label !== undefined) {
    state.labels.push(label.replace(LABEL_BACKTICKS, ""));
    return 1;
  }
  if (!(isBlank(line) || EXPLICIT_MARKUP.test(line))) {
    retireLabels(state);
  }
  state.sections.at(-1)?.body.push(line);
  return 1;
}

export interface RstSection {
  title: string;
  anchor: string;
  text: string;
}

// Splits an RST document into one section per heading, at any level. Text
// before the first heading is dropped, and so are labels at the start of a
// line. Each anchor is an HTML id Sphinx gives the section: the id of its
// title, or of its label when an earlier section already used that id.
// Sphinx numbers a repeated title without a label from a counter shared with
// other generated ids, so such a section is anchored at its parent heading.
export function splitRstSections(rst: string): RstSection[] {
  const lines = rst.replace(LINE_BREAK, "\n").split("\n");
  const state: SplitState = {
    sections: [],
    styles: [],
    usedIds: new Set(),
    labels: [],
  };
  let index = 0;
  while (index < lines.length) {
    index += readLines(state, lines, index);
  }
  return state.sections.map(({ title, anchor, body }) => ({
    title,
    anchor,
    text: body.join("\n").replace(BLANK_LINE_RUNS, "\n\n").trim(),
  }));
}
