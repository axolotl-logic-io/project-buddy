// For the tests of the GitHub workflows (release-config.test.ts): the
// workflows parsed as YAML, so a test reads a step by its id or name and a
// key by its path, whatever the indentation. It parses the block YAML the
// workflows use: mappings, sequences (an item may be a mapping), `|` and `>`
// block scalars, `[a, b]` flow sequences, quoted and plain scalars, and
// comments. Every scalar is a string.

type YamlValue = string | readonly YamlValue[] | YamlMapping;

interface YamlMapping {
  readonly [key: string]: YamlValue;
}

const MAPPING_ENTRY = /^(?<key>[^\s:#][^:#]*?):(?:\s+(?<rest>.*))?$/u;
const SEQUENCE_ITEM = /^-(?:\s+(?<rest>.*))?$/u;
const BLOCK_SCALAR = /^[|>][+-]?$/u;
const FLOW_SEQUENCE = /^\[(?<items>.*)\]$/u;
const TRAILING_COMMENT = /\s+#.*$/u;
const QUOTED = /^(?<quote>["'])(?<text>.*)\k<quote>$/u;

interface Line {
  readonly indent: number;
  readonly text: string;
}

// The workflow's lines, as written and as read. parseSequence rewrites the
// line a mapping starts on in a sequence item.
interface Document {
  readonly lines: Line[];
  readonly raw: string[];
}

function lineOf(raw: string): Line {
  const text = raw.trimStart();
  return { indent: raw.length - text.length, text };
}

function isContent({ text }: Line): boolean {
  return text !== "" && !text.startsWith("#");
}

// The index of the first content line at or after index.
function nextContent(lines: readonly Line[], index: number): number {
  let next = index;
  while (next < lines.length && !isContent(lines[next] ?? lineOf(""))) {
    next += 1;
  }
  return next;
}

function scalar(raw: string): YamlValue {
  const text = raw.replace(TRAILING_COMMENT, "").trim();
  const { text: quoted } = QUOTED.exec(text)?.groups ?? {};
  if (quoted !== undefined) {
    return quoted;
  }
  const { items } = FLOW_SEQUENCE.exec(text)?.groups ?? {};
  if (items !== undefined) {
    return items
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "")
      .map(scalar);
  }
  return text;
}

// The block scalar whose header is at index, more indented than indent:
// literal (`|`) keeps its line breaks, folded (`>`) joins its lines.
function blockScalar(
  { lines, raw }: Document,
  index: number,
  indent: number,
  folded: boolean,
): [string, number] {
  let end = index + 1;
  while (
    end < lines.length &&
    ((lines[end]?.text ?? "") === "" || (lines[end]?.indent ?? 0) > indent)
  ) {
    end += 1;
  }
  const body = lines.slice(index + 1, end);
  const bodyIndent = Math.min(
    ...body.filter(({ text }) => text !== "").map((line) => line.indent),
  );
  const texts = raw
    .slice(index + 1, end)
    .map((line) => line.slice(bodyIndent).trimEnd());
  if (folded) {
    return [texts.filter((text) => text !== "").join(" "), end];
  }
  return [texts.join("\n").trimEnd(), end];
}

function parseValueAfterKey(
  document: Document,
  index: number,
  indent: number,
  rest: string | undefined,
): [YamlValue, number] {
  const { lines } = document;
  if (rest !== undefined && BLOCK_SCALAR.test(rest.trim())) {
    return blockScalar(document, index, indent, rest.startsWith(">"));
  }
  if (rest !== undefined && rest.trim() !== "" && !rest.startsWith("#")) {
    return [scalar(rest), index + 1];
  }
  const next = nextContent(lines, index + 1);
  const line = lines[next];
  if (
    line !== undefined &&
    (line.indent > indent ||
      (line.indent === indent && SEQUENCE_ITEM.test(line.text)))
  ) {
    return parseBlock(document, next, line.indent);
  }
  return ["", index + 1];
}

function parseMapping(
  document: Document,
  start: number,
  indent: number,
): [YamlMapping, number] {
  const { lines } = document;
  const mapping: Record<string, YamlValue> = {};
  let index = nextContent(lines, start);
  for (
    let line = lines[index];
    line !== undefined &&
    line.indent === indent &&
    !SEQUENCE_ITEM.test(line.text);
    line = lines[index]
  ) {
    const { key, rest } = MAPPING_ENTRY.exec(line.text)?.groups ?? {};
    if (key === undefined) {
      throw new Error(`Not a YAML mapping entry: ${line.text}`);
    }
    const [value, next] = parseValueAfterKey(document, index, indent, rest);
    mapping[key.trim()] = value;
    index = nextContent(lines, next);
  }
  return [mapping, index];
}

function parseSequence(
  document: Document,
  start: number,
  indent: number,
): [YamlValue[], number] {
  const { lines, raw } = document;
  const items: YamlValue[] = [];
  let index = nextContent(lines, start);
  for (
    let line = lines[index];
    line !== undefined &&
    line.indent === indent &&
    SEQUENCE_ITEM.test(line.text);
    line = lines[index]
  ) {
    const { rest } = SEQUENCE_ITEM.exec(line.text)?.groups ?? {};
    if (rest === undefined || rest === "") {
      const [item, next] = parseValueAfterKey(
        document,
        index,
        indent,
        undefined,
      );
      items.push(item);
      index = nextContent(lines, next);
    } else if (MAPPING_ENTRY.test(rest)) {
      // A mapping that starts on the item's line: read the line as if the
      // dash were a space.
      const itemIndent = indent + line.text.length - rest.length;
      lines[index] = { indent: itemIndent, text: rest };
      raw[index] = `${" ".repeat(itemIndent)}${rest}`;
      const [item, next] = parseMapping(document, index, itemIndent);
      items.push(item);
      index = next;
    } else {
      items.push(scalar(rest));
      index = nextContent(lines, index + 1);
    }
  }
  return [items, index];
}

function parseBlock(
  document: Document,
  start: number,
  indent: number,
): [YamlValue, number] {
  if (SEQUENCE_ITEM.test(document.lines[start]?.text ?? "")) {
    return parseSequence(document, start, indent);
  }
  return parseMapping(document, start, indent);
}

function isMapping(value: YamlValue | undefined): value is YamlMapping {
  return typeof value === "object" && !Array.isArray(value);
}

// The workflow's YAML, as a mapping.
function parseWorkflow(text: string): YamlMapping {
  const raw = text.split("\n");
  const [value] = parseMapping({ lines: raw.map(lineOf), raw }, 0, 0);
  return value;
}

// The value at path in mapping, or undefined when a key is missing.
function at(
  mapping: YamlMapping,
  ...path: readonly string[]
): YamlValue | undefined {
  let value: YamlValue | undefined = mapping;
  for (const key of path) {
    if (!isMapping(value)) {
      return undefined;
    }
    value = value[key];
  }
  return value;
}

// The steps of a job of the workflow.
function stepsOf(workflow: YamlMapping, job: string): readonly YamlMapping[] {
  const steps = at(workflow, "jobs", job, "steps");
  if (!Array.isArray(steps)) {
    throw new Error(`The job ${job} has no steps`);
  }
  return steps.filter(isMapping);
}

// The step of the job whose id or name is value.
function stepOf(
  workflow: YamlMapping,
  job: string,
  key: "id" | "name",
  value: string,
): YamlMapping {
  const step = stepsOf(workflow, job).find((each) => each[key] === value);
  if (step === undefined) {
    throw new Error(`No step of ${job} has ${key}: ${value}`);
  }
  return step;
}

// The text at path in mapping: "" when it is missing or not text.
function textAt(mapping: YamlMapping, ...path: readonly string[]): string {
  const value = at(mapping, ...path);
  if (typeof value === "string") {
    return value;
  }
  return "";
}

export type { YamlMapping, YamlValue };
export { at, isMapping, parseWorkflow, stepOf, stepsOf, textAt };
