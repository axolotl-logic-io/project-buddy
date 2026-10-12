// The user's choice of theme and mode, per browser: saved in a cookie,
// applied to <html> before the first paint, and changed by the theme picker
// at once, with no reload. The only module that knows the cookie and the
// attributes. use-theme-choice.ts reads the applied choice in a component.
//
// The server never reads the cookie, so every page keeps its prerendered
// shell: the HTML carries the default choice (DEFAULT_THEME_ATTRIBUTES), and
// PRE_PAINT_SCRIPT, inline in <head>, swaps in the saved choice while the
// browser is still parsing. Under System, CSS follows the operating system's
// setting with no script.
import {
  DEFAULT_THEME_CHOICE,
  parseThemeChoice,
  THEME_IDS,
  THEME_MODES,
  type ThemeChoice,
} from "@/themes/themes.ts";

const COOKIE_NAME = "theme";
// The cookie's value is "<theme>.<mode>", such as "gravy-falls.dark".
const COOKIE_VALUE_SEPARATOR = ".";
const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

// The attributes on <html> that contract.css and the theme files select on.
// Exported for the tests that check the CSS and the applied choice; the app
// goes through the functions below.
const THEME_ATTRIBUTE = "data-theme";
const MODE_ATTRIBUTE = "data-mode";

const DEFAULT_THEME_ATTRIBUTES = {
  [THEME_ATTRIBUTE]: DEFAULT_THEME_CHOICE.theme,
  [MODE_ATTRIBUTE]: DEFAULT_THEME_CHOICE.mode,
} as const;

// Plain JavaScript, built from the values above, for an inline <script> in
// <head>. It reads the cookie and copies each part of its value, in order,
// onto its attribute if it names a known theme or mode; anything else leaves
// the default.
const PRE_PAINT_SCRIPT = `try {
  var parts = [
    [${JSON.stringify(THEME_ATTRIBUTE)}, ${JSON.stringify(THEME_IDS)}],
    [${JSON.stringify(MODE_ATTRIBUTE)}, ${JSON.stringify(THEME_MODES)}]
  ];
  var prefix = ${JSON.stringify(`${COOKIE_NAME}=`)};
  var cookie = document.cookie.split("; ").find(function (entry) {
    return entry.indexOf(prefix) === 0;
  });
  if (cookie) {
    var values = cookie.slice(prefix.length).split(${JSON.stringify(COOKIE_VALUE_SEPARATOR)});
    parts.forEach(function (part, index) {
      if (part[1].indexOf(values[index]) !== -1) {
        document.documentElement.setAttribute(part[0], values[index]);
      }
    });
  }
} catch (error) {}`;

// The cookie that saves a choice, as PRE_PAINT_SCRIPT reads it. Exported for
// the tests that start with a saved choice; the app saves through
// chooseTheme and chooseMode.
function themeChoiceCookie(choice: ThemeChoice): {
  readonly name: string;
  readonly value: string;
} {
  return {
    name: COOKIE_NAME,
    value: [choice.theme, choice.mode].join(COOKIE_VALUE_SEPARATOR),
  };
}

function keepUnsaved(): void {
  // The choice still applies to this page; the next visit shows the default.
}

// Without the Cookie Store API (browsers before 2025, or a page that isn't
// on HTTPS or localhost), the choice applies but isn't saved.
function saveThemeChoice(choice: ThemeChoice): void {
  if (!("cookieStore" in globalThis)) {
    return;
  }
  cookieStore
    .set({
      ...themeChoiceCookie(choice),
      path: "/",
      sameSite: "lax",
      expires: Date.now() + DAYS_PER_YEAR * MS_PER_DAY,
    })
    .catch(keepUnsaved);
}

// For useThemeChoice: calls onChange whenever the applied choice changes, and
// returns the function that stops it.
function subscribeToThemeChoice(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: [THEME_ATTRIBUTE, MODE_ATTRIBUTE],
  });
  return (): void => {
    observer.disconnect();
  };
}

// The attributes as applied to the page, unchecked.
function readAppliedTheme(): string | null {
  return document.documentElement.getAttribute(THEME_ATTRIBUTE);
}

function readAppliedMode(): string | null {
  return document.documentElement.getAttribute(MODE_ATTRIBUTE);
}

// Restyles the page at once and saves the choice for the next visit.
function applyThemeChoice(raw: {
  readonly theme: unknown;
  readonly mode: unknown;
}): void {
  const choice = parseThemeChoice(raw);
  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, choice.theme);
  root.setAttribute(MODE_ATTRIBUTE, choice.mode);
  saveThemeChoice(choice);
}

// The user picks a theme (by id) and keeps the mode, or the reverse. A value
// that isn't a known theme or mode applies the default.
function chooseTheme(theme: string): void {
  applyThemeChoice({ theme, mode: readAppliedMode() });
}

function chooseMode(mode: string): void {
  applyThemeChoice({ theme: readAppliedTheme(), mode });
}

export {
  chooseMode,
  chooseTheme,
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  PRE_PAINT_SCRIPT,
  readAppliedMode,
  readAppliedTheme,
  subscribeToThemeChoice,
  THEME_ATTRIBUTE,
  themeChoiceCookie,
};
