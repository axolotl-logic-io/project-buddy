// The extras the user has hidden (src/flags/flags.ts): how the choice is
// kept in this browser and applied to <html> before the first paint. The
// only module that knows the cookie's shape and the attribute;
// use-hidden-flags.ts reads the applied choice in a component.
//
// The choice belongs to her account (users.hidden_extras); the cookie is
// this browser's copy, which the pre-paint script can read. It is written
// in two places, both on the server, through seed-hidden-flags.ts:
// - saving: a switch on the Settings page applies at once and calls
//   saveHiddenFlags (switch-flag.ts), whose Server Action
//   (save-hidden-flags-action.ts) saves the choice to her account and
//   then to this cookie;
// - seeding: signing in (continueSignInAction) copies her account's choice
//   into this cookie, so another browser shows it from its first page.
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
const SECONDS_PER_DAY = 86_400;
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

// The cookie that keeps hidden as the user's choice in this browser, for a
// year, ready for Next's cookies().set. Not HttpOnly, since the pre-paint
// script reads it, and not Secure, as the theme's isn't.
function hiddenFlagsCookie(hidden: readonly FlagId[]): {
  readonly name: string;
  readonly value: string;
  readonly path: string;
  readonly sameSite: "lax";
  readonly maxAge: number;
} {
  return {
    name: COOKIE_NAME,
    value: hidden.join(COOKIE_VALUE_SEPARATOR),
    path: "/",
    sameSite: "lax",
    maxAge: DAYS_PER_YEAR * SECONDS_PER_DAY,
  };
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

// Hides exactly hidden on this page, at once.
function applyHiddenFlags(hidden: readonly FlagId[]): void {
  document.documentElement.setAttribute(
    HIDE_ATTRIBUTE,
    hidden.join(ATTRIBUTE_SEPARATOR),
  );
}

export {
  applyHiddenFlags,
  DEFAULT_FLAG_ATTRIBUTES,
  FLAGS_PRE_PAINT_SCRIPT,
  HIDE_ATTRIBUTE,
  hiddenFlagsCookie,
  hiddenFlagsIn,
  readAppliedHide,
  subscribeToFlags,
};
