// use_case_choose_theme, the first paint: the server sends the same HTML to
// every visitor, with the default theme on <html>, and the script in its
// <head> applies the saved theme and mode before the body is painted, on the
// sign-in page as on every other. The markup is the root layout's own,
// rendered to static HTML around the sign-in page, and the script is the
// one that markup carries, run as the browser runs it.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import RootLayout from "@/app/layout.tsx";
import LoginPage from "@/app/login/page.tsx";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
  themeChoiceCookie,
} from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeChoice } from "@/themes/themes.ts";

// next/font runs only in Next's build; each font's variable class is empty.
vi.mock("next/font/local", () => ({ default: () => ({ variable: "" }) }));
vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);
vi.mock("@/app/login/actions.ts", () => ({
  requestLoginLinkAction: vi.fn(),
}));

// The pre-paint scripts run inside <head>, before the body starts.
const SCRIPT_IN_HEAD =
  /<head>(?:(?!<\/head>).)*<script>[^<]*document\.cookie[^<]*<\/script>(?:(?!<\/head>).)*<\/head>\s*<body/su;

// The theme and mode on an <html>.
interface AppliedChoice {
  readonly theme: string | null;
  readonly mode: string | null;
}

// A saved choice, and the cookies a browser sends with it.
interface SavedChoice {
  readonly name: string;
  readonly cookies: string;
  readonly choice: ThemeChoice;
}

// The sign-in page in the root layout, as the server sends it to a
// signed-out visitor.
function signInPageHtml(): string {
  return renderToStaticMarkup(
    RootLayout({
      children: LoginPage(),
      header: null,
      params: Promise.resolve({}),
    }),
  );
}

function appliedChoice(root: Element): AppliedChoice {
  return {
    theme: root.getAttribute(THEME_ATTRIBUTE),
    mode: root.getAttribute(MODE_ATTRIBUTE),
  };
}

// Puts the attributes of the markup's <html> on the test's document, then
// runs the scripts in the markup's <head> as the browser would, with these
// cookies.
function paintFirst(html: string, cookies: string): void {
  const sent = new DOMParser().parseFromString(html, "text/html");
  const root = document.documentElement;
  for (const { name, value } of sent.documentElement.attributes) {
    root.setAttribute(name, value);
  }
  vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(cookies);
  for (const sentScript of sent.head.querySelectorAll("script")) {
    const script = document.createElement("script");
    script.textContent = sentScript.textContent;
    document.head.append(script);
    script.remove();
  }
}

// The cookies beside the theme's: a session's, or none, as on the sign-in
// page a signed-out visitor is sent to.
const SESSIONS: readonly {
  readonly name: string;
  readonly cookies: readonly string[];
}[] = [
  { name: "signed in", cookies: [`${SESSION_COOKIE_NAME}=abc`] },
  { name: "signed out", cookies: [] },
];

// Each theme under Dark, saved as the picker saves it, with and without a
// session beside it.
const SAVED_CHOICES: readonly SavedChoice[] = THEME_IDS.flatMap((theme) =>
  SESSIONS.map((session): SavedChoice => {
    const choice: ThemeChoice = { theme, mode: "dark" };
    const { name, value } = themeChoiceCookie(choice);
    return {
      name: `${theme}, dark, ${session.name}`,
      cookies: [...session.cookies, `${name}=${value}`].join("; "),
      choice,
    };
  }),
);

let sentHtml = "";

beforeEach(() => {
  sentHtml = signInPageHtml();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("use_case_choose_theme", () => {
  test("the first HTML carries the default theme, and the pre-paint script in its head", () => {
    const sent = new DOMParser().parseFromString(sentHtml, "text/html");

    expect(appliedChoice(sent.documentElement)).toEqual({
      theme: DEFAULT_THEME_ATTRIBUTES[THEME_ATTRIBUTE],
      mode: DEFAULT_THEME_ATTRIBUTES[MODE_ATTRIBUTE],
    });
    expect(sentHtml).toMatch(SCRIPT_IN_HEAD);
  });

  test.each(SAVED_CHOICES)(
    "the first paint shows the saved choice: $name",
    ({ cookies, choice }) => {
      paintFirst(sentHtml, cookies);

      expect(appliedChoice(document.documentElement)).toEqual(choice);
    },
  );
});
