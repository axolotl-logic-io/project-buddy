// The appearance lives in a browser cookie. The root layout reads it for
// the first HTML and the proxy reads it for font preloads. The site panel
// updates the document and cookie together.
import {
  DEFAULT_THEME_CHOICE,
  parseThemeChoice,
  THEME_MODES,
  type ThemeChoice,
} from "@/themes/themes.ts";

const COOKIE_NAME = "theme";
const APPEARANCE_PREFERENCE_PATH = "/api/appearance";
// The cookie's value is "<theme>.<mode>", such as "parchment.dark".
const COOKIE_VALUE_SEPARATOR = ".";
const SECONDS_PER_DAY = 86_400;
const DAYS_PER_YEAR = 365;

// The attributes on <html> that contract.css and the theme files select on.
// Exported for choose-theme.ts and for the tests that check the CSS and the
// applied choice; the rest of the app goes through the functions below.
const THEME_ATTRIBUTE = "data-theme";
const MODE_ATTRIBUTE = "data-mode";

function themeAttributes(choice: ThemeChoice): {
  readonly [THEME_ATTRIBUTE]: ThemeChoice["theme"];
  readonly [MODE_ATTRIBUTE]: ThemeChoice["mode"];
} {
  return { [THEME_ATTRIBUTE]: choice.theme, [MODE_ATTRIBUTE]: choice.mode };
}

const DEFAULT_THEME_ATTRIBUTES = themeAttributes(DEFAULT_THEME_CHOICE);

// Each preview resolves its own palette without changing the page's choice.
// The picker receives opaque attributes; their names remain in this module.
const THEME_SWATCHES = THEME_MODES.map((mode) => ({
  mode,
  attributes: {
    [THEME_ATTRIBUTE]: DEFAULT_THEME_CHOICE.theme,
    [MODE_ATTRIBUTE]: mode,
  },
}));

// Missing, invalid and retired values resolve through the appearance catalog.
function parseThemeChoiceCookie(value: string | undefined): ThemeChoice {
  const [theme, mode] = (value ?? "").split(COOKIE_VALUE_SEPARATOR);
  return parseThemeChoice({ theme, mode });
}

function applyThemeAttributes(choice: ThemeChoice): void {
  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, choice.theme);
  root.setAttribute(MODE_ATTRIBUTE, choice.mode);
}

// Both save paths use the same cookie name, scope and lifetime.
function themeChoiceCookie(choice: ThemeChoice): {
  readonly name: string;
  readonly value: string;
  readonly path: string;
  readonly sameSite: "lax";
  readonly maxAge: number;
} {
  return {
    name: COOKIE_NAME,
    value: [choice.theme, choice.mode].join(COOKIE_VALUE_SEPARATOR),
    path: "/",
    sameSite: "lax",
    maxAge: DAYS_PER_YEAR * SECONDS_PER_DAY,
  };
}

function readThemeChoiceCookie(): string | undefined {
  const prefix = `${COOKIE_NAME}=`;
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
}

// A client-rendered error recovery can start with a fresh document.
function applySavedThemeChoice(): void {
  const saved = readThemeChoiceCookie();
  if (saved !== undefined) {
    applyThemeAttributes(parseThemeChoiceCookie(saved));
  }
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
  APPEARANCE_PREFERENCE_PATH,
  applySavedThemeChoice,
  applyThemeAttributes,
  COOKIE_NAME as THEME_COOKIE_NAME,
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  parseThemeChoiceCookie,
  readAppliedMode,
  readAppliedTheme,
  subscribeToThemeChoice,
  THEME_ATTRIBUTE,
  THEME_SWATCHES,
  themeAttributes,
  themeChoiceCookie,
};
