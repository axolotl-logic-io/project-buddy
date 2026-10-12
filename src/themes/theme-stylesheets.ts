/// <reference types="vite/client" />
// For the theme module's tests: its stylesheets as text, and the parts of
// them those tests compare. Vitest loads the CSS (vitest.config.mts lets it
// through); the app never imports this file.
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";

const STYLESHEETS = import.meta.glob<string>("./*.css", {
  query: "?raw",
  import: "default",
  eager: true,
});

// import.meta.glob names each file "./<name>.css".
const PATH_PREFIX = "./";
const PATH_SUFFIX = ".css";

const COMMENT = /\/\*[\s\S]*?\*\//gu;
const RULE_START = /(?<prelude>[^{};]*)\{/gu;
const BRACE = /[{}]/gu;
const DECLARATION = /--(?<name>[\w-]+):\s*(?<value>[^;]+);/gu;
const READ = /var\(--(?<name>[\w-]+)/gu;
const DEPTH_CHANGE: Readonly<Record<string, number>> = { "{": 1, "}": -1 };

// The name of every stylesheet in src/themes, without ".css".
const THEME_STYLESHEET_NAMES: readonly string[] = Object.keys(STYLESHEETS).map(
  (path) => path.slice(PATH_PREFIX.length, -PATH_SUFFIX.length),
);

// src/themes/<name>.css without its comments, or "" if there is none.
function themeStylesheet(name: string): string {
  const { [`${PATH_PREFIX}${name}${PATH_SUFFIX}`]: css = "" } = STYLESHEETS;
  return css.replace(COMMENT, "");
}

// The text inside the braces that open at `start`, up to the brace that
// closes them.
function bodyFrom(css: string, start: number): string {
  let depth = 1;
  for (const brace of css.slice(start).matchAll(BRACE)) {
    const { [brace[0]]: change = 0 } = DEPTH_CHANGE;
    depth += change;
    if (depth === 0) {
      return css.slice(start, start + brace.index);
    }
  }
  return css.slice(start);
}

// The body of the first rule (or at-rule) in `css` whose selector list
// includes `selector`, as written; "" if there is none.
function ruleBody(css: string, selector: string): string {
  for (const match of css.matchAll(RULE_START)) {
    const { groups: { prelude = "" } = {} } = match;
    if (prelude.split(",").some((part) => part.trim() === selector)) {
      return bodyFrom(css, match.index + match[0].length);
    }
  }
  return "";
}

// Every custom property `css` sets, by name without "--", to its value.
function customProperties(css: string): ReadonlyMap<string, string> {
  return new Map(
    [...css.matchAll(DECLARATION)].map(
      ({ groups: { name = "", value = "" } = {} }) => [name, value.trim()],
    ),
  );
}

// Every custom property `css` reads with var(), by name without "--".
function customPropertyReads(css: string): ReadonlySet<string> {
  return new Set(
    [...css.matchAll(READ)].map(({ groups: { name = "" } = {} }) => name),
  );
}

// The body of contract.css's rule for a mode attribute value, such as
// `[data-mode="dark"]`, inside `within` (the whole contract by default).
function modeRule(mode: string, within = themeStylesheet("contract")): string {
  return ruleBody(within, `[${MODE_ATTRIBUTE}="${mode}"]`);
}

// The colour tokens: the ones contract.css sets under Light.
const COLOR_TOKENS: readonly string[] = [
  ...customProperties(modeRule("light")).keys(),
];

// The custom properties a theme's stylesheet sets for that theme, by name
// without "--", such as "light-background" or "control-radius".
function themeTokens(themeId: string): ReadonlyMap<string, string> {
  return customProperties(
    ruleBody(themeStylesheet(themeId), `[${THEME_ATTRIBUTE}="${themeId}"]`),
  );
}

export {
  COLOR_TOKENS,
  customProperties,
  customPropertyReads,
  modeRule,
  ruleBody,
  THEME_STYLESHEET_NAMES,
  themeStylesheet,
  themeTokens,
};
