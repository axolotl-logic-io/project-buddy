/// <reference types="vite/client" />
// For the theme module's tests: what its stylesheets declare, read from the
// CSS itself. The readers name what the tests compare (a theme's tokens, the
// colours each mode shows, the stylesheets themes.css imports), so no test
// needs to know how the CSS is laid out. Vitest loads the CSS
// (vitest.config.mts lets it through); the app never imports this file.
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";

const STYLESHEETS = import.meta.glob<string>("./*.css", {
  query: "?raw",
  import: "default",
  eager: true,
});

const { "../components/chat/chat.css": CHAT_STYLESHEET = "" } =
  import.meta.glob<string>("../components/chat/chat.css", {
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
const IMPORT =
  /@import "\.\/(?<name>[\w-]+)\.css" layer\((?<layer>[\w-]+)\);/gu;
const DEPTH_CHANGE: Readonly<Record<string, number>> = { "{": 1, "}": -1 };

// The at-rule under which contract.css sets System's colours when the
// operating system asks for dark.
const SYSTEM_DARK = "@media (prefers-color-scheme: dark)";
// The at-rule that declares Streamdown's names in chat.css.
const REFERENCE_THEME = "@theme reference";

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

// The colour tokens contract.css sets under a mode attribute value, such as
// "dark", inside `within` (the whole contract by default), to their values.
function modeColors(
  mode: string,
  within = themeStylesheet("contract"),
): ReadonlyMap<string, string> {
  return customProperties(ruleBody(within, `[${MODE_ATTRIBUTE}="${mode}"]`));
}

// The colour tokens contract.css sets under each mode, by name without "--",
// to their values: under Light; under Dark; and under System when the
// operating system asks for dark (the Light rule covers System otherwise).
function modeColorMappings(): {
  readonly light: ReadonlyMap<string, string>;
  readonly dark: ReadonlyMap<string, string>;
  readonly systemDark: ReadonlyMap<string, string>;
} {
  return {
    light: modeColors("light"),
    dark: modeColors("dark"),
    systemDark: modeColors(
      "system",
      ruleBody(themeStylesheet("contract"), SYSTEM_DARK),
    ),
  };
}

// The colour tokens: the ones contract.css sets under Light.
const COLOR_TOKENS: readonly string[] = [...modeColors("light").keys()];

// The stylesheets themes.css imports, by name without ".css", to the layer
// it imports each one into.
function themeImports(): ReadonlyMap<string, string> {
  return new Map(
    [...themeStylesheet("themes").matchAll(IMPORT)].map(
      ({ groups: { name = "", layer = "" } = {} }) => [name, layer],
    ),
  );
}

// Every custom property contract.css sets anywhere, by name without "--", to
// its value, such as "color-surface" (a utility's) or "background" (a mode's).
function contractTokens(): ReadonlyMap<string, string> {
  return customProperties(themeStylesheet("contract"));
}

// Every custom property contract.css reads, by name without "--".
function contractReads(): ReadonlySet<string> {
  return customPropertyReads(themeStylesheet("contract"));
}

// The body of a theme's rule in its own stylesheet.
function themeRule(themeId: string): string {
  return ruleBody(
    themeStylesheet(themeId),
    `[${THEME_ATTRIBUTE}="${themeId}"]`,
  );
}

// The custom properties a theme's stylesheet sets for that theme, by name
// without "--", such as "light-background" or "control-radius".
function themeTokens(themeId: string): ReadonlyMap<string, string> {
  return customProperties(themeRule(themeId));
}

// The custom properties a theme's values read, by name without "--", such as
// the typeface variable its fonts name.
function themeReads(themeId: string): ReadonlySet<string> {
  return customPropertyReads(themeRule(themeId));
}

// The theme variables chat.css's reference theme declares for Streamdown's
// classes, by name without "--", such as "color-border" or "radius-md".
function streamdownThemeNames(): readonly string[] {
  return [
    ...customProperties(
      ruleBody(CHAT_STYLESHEET.replace(COMMENT, ""), REFERENCE_THEME),
    ).keys(),
  ];
}

export {
  COLOR_TOKENS,
  contractReads,
  contractTokens,
  modeColorMappings,
  streamdownThemeNames,
  THEME_STYLESHEET_NAMES,
  themeImports,
  themeReads,
  themeTokens,
};
