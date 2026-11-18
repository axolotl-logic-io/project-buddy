/// <reference types="vite/client" />
// For the theme module's tests: what its stylesheets declare, read from the
// CSS itself. The readers name what the tests compare (the tokens the
// contract reads, the colour tokens its utilities show, the stylesheets
// themes.css loads), so no test needs to know how the CSS is laid out: a
// theme may keep its values in one file or split them across files it
// imports, under src/themes or a folder there. The values each appearance
// shows are read in the browser, through the real cascade
// (theme-tokens.browser.test.tsx). Vitest loads the CSS (vitest.config.mts
// lets it through); the app never imports this file.

const STYLESHEETS = import.meta.glob<string>("./**/*.css", {
  base: "/src/themes",
  query: "?raw",
  import: "default",
  eager: true,
});

const { "../components/chat/chat.css": CHAT_STYLESHEET = "" } =
  import.meta.glob<string>("../components/chat/chat.css", {
    base: "/src/themes",
    query: "?raw",
    import: "default",
    eager: true,
  });

// import.meta.glob names each file "./<path>.css".
const PATH_PREFIX = "./";
const PATH_SUFFIX = ".css";
// Where import paths resolve from: any absolute URL standing for src/themes.
const THEMES_URL = "file:///themes/";

const COMMENT = /\/\*[\s\S]*?\*\//gu;
const RULE_START = /(?<prelude>[^{};]*)\{/gu;
const BRACE = /[{}]/gu;
const DECLARATION = /--(?<name>[\w-]+):\s*(?<value>[^;]+);/gu;
const READ = /var\(--(?<name>[\w-]+)/gu;
const IMPORT =
  /@import\s+(?:url\()?"(?<path>[^"]+\.css)"\)?(?:\s+layer\((?<layer>[\w-]+)\))?[^;]*;/gu;
// A colour utility's theme variable, such as `--color-surface: var(--surface)`.
const COLOR_UTILITY = /^color-[\w-]+$/u;
const TOKEN_READ = /^var\(--(?<token>[\w-]+)\)$/u;
const DEPTH_CHANGE: Readonly<Record<string, number>> = { "{": 1, "}": -1 };

// The at-rule that declares Streamdown's names in chat.css.
const REFERENCE_THEME = "@theme reference";
// The stylesheet the site imports, which loads every other one.
const ENTRY = "themes";
// The contract: the tokens every theme sets, and the utilities that read them.
const CONTRACT = "contract";

interface Import {
  // The stylesheet's path under src/themes, without ".css", such as
  // "parchment" or "parchment/light".
  readonly name: string;
  // The cascade layer it is imported into, or "" for none.
  readonly layer: string;
}

// The path of every stylesheet under src/themes, without ".css", such as
// "contract" or "parchment/light".
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

// Every custom property `css` sets, by name without "--", to its value (the
// last one, if it sets it more than once).
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

// The stylesheets src/themes/<from>.css imports, each resolved from its own
// folder to a path under src/themes.
function importsOf(from: string): readonly Import[] {
  const base = new URL(`${from}${PATH_SUFFIX}`, THEMES_URL);
  return [...themeStylesheet(from).matchAll(IMPORT)].map(
    ({ groups: { path = "", layer = "" } = {} }) => {
      const resolved = new URL(path, base).href;
      return {
        name: resolved.slice(THEMES_URL.length, -PATH_SUFFIX.length),
        layer,
      };
    },
  );
}

// `names` and every stylesheet they import, however deep.
function withImports(names: readonly string[]): ReadonlySet<string> {
  const found = new Set<string>();
  const waiting = [...names];
  for (let name = waiting.pop(); name !== undefined; name = waiting.pop()) {
    if (!found.has(name)) {
      found.add(name);
      waiting.push(...importsOf(name).map((entry) => entry.name));
    }
  }
  return found;
}

// The stylesheets themes.css imports, by path without ".css", to the layer
// it imports each one into.
function themeImports(): ReadonlyMap<string, string> {
  return new Map(importsOf(ENTRY).map(({ name, layer }) => [name, layer]));
}

// Every stylesheet the site loads through themes.css, however deep.
function loadedStylesheets(): ReadonlySet<string> {
  return withImports([ENTRY]);
}

// Whether a stylesheet's path names it for themeId: "<id>", "<id>-<part>" or
// anything in the "<id>/" folder.
function namedFor(themeId: string, name: string): boolean {
  return (
    name === themeId ||
    name.startsWith(`${themeId}-`) ||
    name.startsWith(`${themeId}/`)
  );
}

// The stylesheets a theme's values live in: those themes.css imports for it,
// and everything they import.
function themeStylesheetNames(themeId: string): ReadonlySet<string> {
  return withImports(
    importsOf(ENTRY)
      .map(({ name }) => name)
      .filter((name) => namedFor(themeId, name)),
  );
}

// Every custom property the contract's stylesheets set anywhere, by name
// without "--", to its value, such as "color-surface" (a utility's) or
// "background" (a mode's).
function contractTokens(): ReadonlyMap<string, string> {
  return customProperties(
    [...withImports([CONTRACT])].map(themeStylesheet).join("\n"),
  );
}

// Every custom property the contract's stylesheets read, by name without "--".
function contractReads(): ReadonlySet<string> {
  return customPropertyReads(
    [...withImports([CONTRACT])].map(themeStylesheet).join("\n"),
  );
}

// The tokens a theme must set: every one the contract reads but doesn't set.
function themeSetTokens(): readonly string[] {
  const set = contractTokens();
  return [...contractReads()].filter((token) => !set.has(token));
}

// The contract's colour utilities, such as "color-surface", to the value
// each one shows, such as "var(--surface)".
function colorUtilities(): ReadonlyMap<string, string> {
  return new Map(
    [...contractTokens()].filter(([name]) => COLOR_UTILITY.test(name)),
  );
}

// The colour tokens: the tokens the contract's colour utilities read, such
// as "surface" or "code-keyword".
function colorTokens(): readonly string[] {
  return [
    ...new Set(
      [...colorUtilities().values()].flatMap((value) => {
        const { groups: { token = "" } = {} } = TOKEN_READ.exec(value) ?? {};
        if (token === "") {
          return [];
        }
        return [token];
      }),
    ),
  ];
}

// The custom properties a theme's stylesheets read, by name without "--",
// such as the typeface variables its fonts name, in any rule and any file.
function themeReads(themeId: string): ReadonlySet<string> {
  return customPropertyReads(
    [...themeStylesheetNames(themeId)].map(themeStylesheet).join("\n"),
  );
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
  colorTokens,
  colorUtilities,
  loadedStylesheets,
  namedFor,
  streamdownThemeNames,
  THEME_STYLESHEET_NAMES,
  themeImports,
  themeReads,
  themeSetTokens,
  themeStylesheetNames,
};
