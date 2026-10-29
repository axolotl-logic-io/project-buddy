// The user's choice of theme and mode, per browser: saved in a cookie,
// applied to <html> before the first paint, and changed in the site menu
// at once, with no reload. The only module that knows the cookie and the
// attributes. use-theme-choice.ts reads the applied choice in a component.
//
// The cookie is written only on the server: the menu applies a choice at
// once (choose-theme.ts) and then calls saveThemeChoiceAction
// (save-theme-choice-action.ts), which sets themeChoiceSetCookie. It is read
// by THEME_PRE_PAINT_SCRIPT, to apply the choice, and by the proxy
// (src/proxy.ts, through parseThemeChoiceCookie), only for the saved theme's
// font preload hints.
//
// Rendering never reads the cookie, so every page keeps its prerendered
// shell: the HTML carries the default choice (DEFAULT_THEME_ATTRIBUTES), and
// THEME_PRE_PAINT_SCRIPT, inline in <head>, swaps in the saved choice while
// the browser is still parsing. Under System, CSS follows the operating system's
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
const SECONDS_PER_DAY = 86_400;
const DAYS_PER_YEAR = 365;

// The attributes on <html> that contract.css and the theme files select on.
// Exported for choose-theme.ts and for the tests that check the CSS and the
// applied choice; the rest of the app goes through the functions below.
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
const THEME_PRE_PAINT_SCRIPT = `try {
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

// The cookie that saves a choice, as THEME_PRE_PAINT_SCRIPT reads it.
// Exported for the tests that start with a saved choice; the app saves
// through themeChoiceSetCookie.
function themeChoiceCookie(choice: ThemeChoice): {
  readonly name: string;
  readonly value: string;
} {
  return {
    name: COOKIE_NAME,
    value: [choice.theme, choice.mode].join(COOKIE_VALUE_SEPARATOR),
  };
}

// The choice a cookie's value saves, read part by part as
// THEME_PRE_PAINT_SCRIPT reads it: a missing, unknown or malformed part is
// the default, never an error.
function parseThemeChoiceCookie(value: string | undefined): ThemeChoice {
  const [theme, mode] = (value ?? "").split(COOKIE_VALUE_SEPARATOR);
  return parseThemeChoice({ theme, mode });
}

// The cookie that saves a choice for a year, ready for Next's
// cookies().set. Not HttpOnly, since the pre-paint script reads it, and not
// Secure, as the hidden extras' isn't.
function themeChoiceSetCookie(choice: ThemeChoice): {
  readonly name: string;
  readonly value: string;
  readonly path: string;
  readonly sameSite: "lax";
  readonly maxAge: number;
} {
  return {
    ...themeChoiceCookie(choice),
    path: "/",
    sameSite: "lax",
    maxAge: DAYS_PER_YEAR * SECONDS_PER_DAY,
  };
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

export {
  COOKIE_NAME as THEME_COOKIE_NAME,
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  parseThemeChoiceCookie,
  readAppliedMode,
  readAppliedTheme,
  subscribeToThemeChoice,
  THEME_ATTRIBUTE,
  THEME_PRE_PAINT_SCRIPT,
  themeChoiceCookie,
  themeChoiceSetCookie,
};
