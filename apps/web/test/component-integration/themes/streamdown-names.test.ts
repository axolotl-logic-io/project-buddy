/// <reference types="vite/client" />
// Streamdown's names (chat.css's reference theme) compile anywhere, but only
// the Markdown may use them: outside it, they style nothing or stand in for
// a contract utility. So no file in src/ but chat.css writes one as a class.
// This file is left out too: it names Tailwind's utilities, not classes.
import ts from "typescript";
import { describe, expect, test } from "vitest";
import { streamdownThemeNames } from "../../support/themes/theme-stylesheets.ts";

const SOURCES = import.meta.glob<string>(
  [
    "/src/**/*.{ts,tsx,css}",
    "/test/**/*.{ts,tsx,css}",
    "!/test/system/**",
    "!/src/components/chat/chat.css",
    "!/test/component-integration/themes/streamdown-names.test.ts",
  ],
  { query: "?raw", import: "default", eager: true },
);

const CSS_COMMENT = /\/\*[\s\S]*?\*\//gu;
// A // comment, but not the // of a URL such as https://.
const LINE_COMMENT = /(?<=^|\s)\/\/.*$/gmu;
const CSS_FILE = /\.css$/u;

// Tailwind's utilities that take a colour from a --color-* theme name, such
// as bg-<name> or border-t-<name>.
const COLOR_UTILITIES = `(?:${[
  "bg",
  "text",
  "border(?:-[xytrblse])?",
  "ring(?:-offset)?",
  "inset-ring",
  "outline",
  "divide",
  "fill",
  "stroke",
  "decoration",
  "caret",
  "accent",
  "placeholder",
  "from",
  "via",
  "to",
  "shadow",
  "inset-shadow",
  "drop-shadow",
  "text-shadow",
].join("|")})`;
// Tailwind's utilities that take a corner radius from --radius or a
// --radius-* theme name: every corner, a side's or one corner's.
const RADIUS_UTILITIES = "rounded(?:-(?:[trblse]|tl|tr|br|bl|ss|se|es|ee))?";

// The classes that read the theme name `name` (without "--"), as a regex
// source, or undefined for a namespace this test doesn't know.
function utilityPattern(name: string): string | undefined {
  const [namespace = "", ...rest] = name.split("-");
  const suffix = rest.map((part) => `-${part}`).join("");
  switch (namespace) {
    case "color":
      return `${COLOR_UTILITIES}${suffix}`;
    case "radius":
      return `${RADIUS_UTILITIES}${suffix}`;
    case "shadow":
      return `shadow${suffix}`;
    default:
      return;
  }
}

const NAMES = streamdownThemeNames();
const PATTERNS = NAMES.map(utilityPattern);

// A Streamdown class: one of the patterns as a whole class, after any
// variants (hover:) and with any opacity (/50).
const STREAMDOWN_CLASS = new RegExp(
  `(?<![\\w-])(?:${PATTERNS.join("|")})(?:/[\\w.]+)?(?![\\w-])`,
  "gu",
);

// Description properties contain prose, not class lists. Parse their string
// boundaries so words such as "rounded" in artwork descriptions stay prose.
// Other strings, including className in the same file, remain checked.
function withoutDescriptions(source: string): string {
  const file = ts.createSourceFile(
    "source.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const ranges: { readonly start: number; readonly end: number }[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "description" &&
      ts.isStringLiteral(node.initializer)
    ) {
      ranges.push({
        start: node.initializer.getStart(file),
        end: node.initializer.end,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  let text = source;
  for (const range of ranges.reverse()) {
    text = text.slice(0, range.start) + text.slice(range.end);
  }
  return text;
}

// The text of a file that can hold classes: without comments or description prose.
function classText(path: string, source: string): string {
  if (CSS_FILE.test(path)) {
    return source.replace(CSS_COMMENT, "");
  }
  return withoutDescriptions(source).replace(LINE_COMMENT, "");
}

// Every Streamdown class in text, as written.
function streamdownClassesIn(text: string): readonly string[] {
  return [...text.matchAll(STREAMDOWN_CLASS)].map(([written]) => written);
}

describe("Streamdown's names", () => {
  test("description prose is distinct from class strings in the same file", () => {
    const source =
      'const art = { description: "A rounded head on parchment.", className: "rounded" };';
    expect(streamdownClassesIn(classText("visual.ts", source))).toEqual([
      "rounded",
    ]);
  });

  test("are read from chat.css, each with its utilities", () => {
    expect(NAMES).toContain("color-border");
    expect(NAMES).toContain("radius");
    expect(NAMES).toContain("shadow-lg");
    expect(PATTERNS).not.toContain(undefined);
  });

  test("are written as classes nowhere in src/ but chat.css", () => {
    const written = Object.entries(SOURCES).flatMap(([path, source]) =>
      streamdownClassesIn(classText(path, source)).map(
        (name) => `${path}: ${name}`,
      ),
    );

    expect(Object.keys(SOURCES)).toContain("/src/app/page-roles.css");
    expect(Object.keys(SOURCES)).toContain("/src/components/ui/button.tsx");
    expect(written).toEqual([]);
  });
});
