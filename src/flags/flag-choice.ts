// The extras the user has hidden (src/flags/flags.ts), per browser: saved in
// a cookie, applied to <html> before the first paint, and changed by the
// Settings page's switches at once, with no reload. The only module that
// knows the cookie and the attribute; use-hidden-flags.ts reads the applied
// choice in a component.
//
// As with the theme (src/themes/theme-choice.ts), the server never reads the
// cookie, so every page keeps its prerendered shell: the HTML carries the
// default (DEFAULT_FLAG_ATTRIBUTES), and FLAGS_PRE_PAINT_SCRIPT, inline in
// <head>, swaps in the saved choice while the browser is still parsing.
import {
  DEFAULT_HIDDEN_FLAGS,
  FLAG_IDS,
  type FlagId,
  knownFlags,
} from "@/flags/flags.ts";

const COOKIE_NAME = "hidden-extras";
// The cookie's value is the hidden flags' ids joined by ".", such as
// "working-notes.tool-lines", or "" when the user shows every extra. Once
// saved, it replaces the defaults.
const COOKIE_VALUE_SEPARATOR = ".";
const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

// The attribute on <html> that src/flags/extras.css selects on: the hidden
// flags' ids, separated by spaces, so a rule matches one with ~=.
const HIDE_ATTRIBUTE = "data-hide";
const ATTRIBUTE_SEPARATOR = " ";

const DEFAULT_FLAG_ATTRIBUTES = {
  [HIDE_ATTRIBUTE]: DEFAULT_HIDDEN_FLAGS.join(ATTRIBUTE_SEPARATOR),
} as const;

// Plain JavaScript, built from the values above, for an inline <script> in
// <head>. If the cookie is saved, it hides the known flags the cookie names,
// in FLAG_IDS' order; anything else in it is left out.
const FLAGS_PRE_PAINT_SCRIPT = `try {
  var flags = ${JSON.stringify(FLAG_IDS)};
  var prefix = ${JSON.stringify(`${COOKIE_NAME}=`)};
  var cookie = document.cookie.split("; ").find(function (entry) {
    return entry.indexOf(prefix) === 0;
  });
  if (cookie !== undefined) {
    var saved = cookie.slice(prefix.length).split(${JSON.stringify(COOKIE_VALUE_SEPARATOR)});
    var hidden = flags.filter(function (flag) {
      return saved.indexOf(flag) !== -1;
    });
    document.documentElement.setAttribute(${JSON.stringify(HIDE_ATTRIBUTE)}, hidden.join(${JSON.stringify(ATTRIBUTE_SEPARATOR)}));
  }
} catch (error) {}`;

// The cookie that saves hidden as the user's choice: its name and value.
function hiddenFlagsCookie(hidden: readonly FlagId[]): {
  readonly name: string;
  readonly value: string;
} {
  return { name: COOKIE_NAME, value: hidden.join(COOKIE_VALUE_SEPARATOR) };
}

function keepUnsaved(): void {
  // The choice still applies to this page; the next visit shows the default.
}

// Saves the user's choice for the next visit. Without the Cookie Store API
// (browsers before 2025, or a page that isn't on HTTPS or localhost), the
// choice applies but isn't saved.
//
// The seam for accounts: when the choice belongs to the user's account
// rather than this browser, this is the one place that saves it.
function saveHiddenFlags(hidden: readonly FlagId[]): void {
  if (!("cookieStore" in globalThis)) {
    return;
  }
  cookieStore
    .set({
      ...hiddenFlagsCookie(hidden),
      path: "/",
      sameSite: "lax",
      expires: Date.now() + DAYS_PER_YEAR * MS_PER_DAY,
    })
    .catch(keepUnsaved);
}

// For useHiddenFlags: calls onChange whenever the hidden flags change, and
// returns the function that stops it.
function subscribeToFlags(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: [HIDE_ATTRIBUTE],
  });
  return (): void => {
    observer.disconnect();
  };
}

// The attribute as applied to the page, unchecked.
function readAppliedHide(): string | null {
  return document.documentElement.getAttribute(HIDE_ATTRIBUTE);
}

// The known flags that an applied attribute's value hides.
function hiddenFlagsIn(applied: string | null): FlagId[] {
  return knownFlags((applied ?? "").split(ATTRIBUTE_SEPARATOR));
}

// Shows (on) or hides the extra at once, and saves the choice for the next
// visit.
function switchFlag(id: FlagId, on: boolean): void {
  const others = hiddenFlagsIn(readAppliedHide()).filter((flag) => flag !== id);
  let hidden = others;
  if (!on) {
    hidden = knownFlags([...others, id]);
  }
  document.documentElement.setAttribute(
    HIDE_ATTRIBUTE,
    hidden.join(ATTRIBUTE_SEPARATOR),
  );
  saveHiddenFlags(hidden);
}

export {
  DEFAULT_FLAG_ATTRIBUTES,
  FLAGS_PRE_PAINT_SCRIPT,
  HIDE_ATTRIBUTE,
  hiddenFlagsCookie,
  hiddenFlagsIn,
  readAppliedHide,
  subscribeToFlags,
  switchFlag,
};
