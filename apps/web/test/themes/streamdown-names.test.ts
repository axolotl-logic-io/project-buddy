/// <reference types="vite/client" />
// Streamdown's names (chat.css's reference theme) compile anywhere, but only
// the Markdown may use them: outside it, they style nothing or stand in for
// a contract utility. So no file in src/ but chat.css writes one as a class.
// This file is left out too: it names Tailwind's utilities, not classes.
import { describe, expect, test } from "vitest";
import { streamdownThemeNames } from "./theme-stylesheets.ts";

const SOURCES = import.meta.glob<string>(
  [
    "/src/**/*.{ts,tsx,css}",
    "/test/**/*.{ts,tsx,css}",
    "!/src/components/chat/chat.css",
    "!/test/themes/streamdown-names.test.ts",
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

// The text of a file that can hold classes: without its comments.
function classText(path: string, source: string): string {
  if (CSS_FILE.test(path)) {
    return source.replace(CSS_COMMENT, "");
  }
  return source.replace(LINE_COMMENT, "");
}

// Every Streamdown class in text, as written.
function streamdownClassesIn(text: string): readonly string[] {
  return [...text.matchAll(STREAMDOWN_CLASS)].map(([written]) => written);
}

describe("Streamdown's names", () => {
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
