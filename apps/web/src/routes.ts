// The app's route paths that code refers to.
import type { Route } from "next";
import type { PromptKind } from "@/prompts/prompt.ts";

// Where a visitor without a session is sent.
const SIGN_IN_PATH = "/login";

// Where a signed-in user lands, and where "/" and the links home go: the
// atlas homepage.
const HOME_PATH = "/home";

// Chat, the user's one private conversation for talking without a goal.
const STANDALONE_CHAT_PATH = "/chat";

// The Workshop's address, showing the kind's tab. Activities live only
// there: they are instructions a construct follows, not a place to start
// from.
function workshopPath(kind: PromptKind): Route {
  if (kind === "construct") {
    return "/workshop";
  }
  return `/workshop?kind=${kind}`;
}

// The Settings page.
const SETTINGS_PATH = "/settings";

// The page a sign-in link opens, and its parameter naming where continuing
// leads, when not home.
const SIGN_IN_LINK_PATH = "/login/link";
const SIGN_IN_DESTINATION_PARAMETER = "next";

// A path on this site: segments of letters, digits, "_" and "-" only, so
// never another site's address ("//host", "/\host"), a scheme, a query or
// a dot segment.
const LOCAL_PATH = /^(?:\/[\w-]+)+$/u;

// The value as a local path to send a browser to, or undefined unless it is
// one (LOCAL_PATH).
function localPath(value: unknown): string | undefined {
  if (typeof value === "string" && LOCAL_PATH.test(value)) {
    return value;
  }
  return undefined;
}

export {
  HOME_PATH,
  localPath,
  SETTINGS_PATH,
  SIGN_IN_DESTINATION_PARAMETER,
  SIGN_IN_LINK_PATH,
  SIGN_IN_PATH,
  STANDALONE_CHAT_PATH,
  workshopPath,
};
