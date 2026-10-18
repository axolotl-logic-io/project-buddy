// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  type SessionUser,
} from "@/auth/session-token.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { config, proxy, themeFontPreloadLinks } from "@/proxy.ts";
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { userIdFixture } from "./id-fixtures.ts";
import {
  fontPreloads,
  themeFontUrls,
} from "./themes/font-preloads-test-kit.ts";

const secret = "test-session-secret";
const user: SessionUser = { id: userIdFixture(), sessionEpoch: 0 };

function request(
  path: string,
  sessionToken?: string,
  themeCookie?: string,
): NextRequest {
  const cookies: string[] = [];
  if (sessionToken !== undefined) {
    cookies.push(`${SESSION_COOKIE_NAME}=${sessionToken}`);
  }
  if (themeCookie !== undefined) {
    cookies.push(`theme=${themeCookie}`);
  }
  const headers = new Headers();
  if (cookies.length > 0) {
    headers.set("cookie", cookies.join("; "));
  }
  return new NextRequest(`https://buddy.example${path}`, { headers });
}

// The `Link` header entry that preloads a typeface's font file.
function fontPreload(typeface: string): string {
  return `<${TYPEFACE_FONT_URLS[typeface]}>; rel=preload; as=font; type="font/woff2"; crossorigin`;
}

const GRAVY_FALLS_PRELOADS = [
  "typeface-grandstander",
  "typeface-nunito",
  "typeface-jetbrains-mono",
].map(fontPreload);

// Where a response redirects to, or null if it doesn't.
function redirectUrl(response: Response): string | null {
  return response.headers.get("location");
}

function passesThrough(response: Response): boolean {
  return response.headers.get("x-middleware-next") === "1";
}

describe("proxy matcher", () => {
  test.each(["/", "/login", "/projects/1", "/api/chat"])(
    "runs on %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    },
  );

  test.each([
    "/_next/static/chunks/app.js",
    "/_next/image?url=x",
    "/favicon.ico",
  ])("skips the static asset %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });
});

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", secret);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy public paths", () => {
  test.each(["/login", "/signup", "/login/link"])(
    "lets anyone reach %s and its Server Actions",
    async (path) => {
      expect(passesThrough(await proxy(request(path)))).toBe(true);
    },
  );

  test("admits no other path below a public one", async () => {
    expect(redirectUrl(await proxy(request("/login/other")))).toBe(
      "https://buddy.example/login",
    );
  });
});

describe("proxy sessions", () => {
  test("redirects a page request without a session to /login", async () => {
    const response = await proxy(request("/projects/1"));

    expect(redirectUrl(response)).toBe("https://buddy.example/login");
  });

  test("rejects an API request without a session with 401 and the signed-out case", async () => {
    const response = await proxy(request("/api/chat"));

    expect(response.status).toBe(HTTP_STATUS.unauthorized);
    expect(readAppErrorCase(await response.text())).toBe("signed-out");
  });

  test("rejects an API request whose session has expired as signed out", async () => {
    const longAgo = new Date("2020-01-01T00:00:00Z");
    const token = await createSessionToken(user, secret, longAgo);

    const response = await proxy(request("/api/chat", token));

    expect(response.status).toBe(HTTP_STATUS.unauthorized);
    expect(await response.text()).toBe("signed-out");
  });

  test("redirects a request whose session is signed with another secret", async () => {
    const token = await createSessionToken(user, "other-secret", new Date());

    expect(redirectUrl(await proxy(request("/", token)))).toBe(
      "https://buddy.example/login",
    );
  });

  test("lets a request with a valid session through", async () => {
    const token = await createSessionToken(user, secret, new Date());

    expect(passesThrough(await proxy(request("/", token)))).toBe(true);
    expect(passesThrough(await proxy(request("/api/chat", token)))).toBe(true);
  });

  test("redirects a request whose session is in the format before accounts", async () => {
    const oldToken =
      "1794225600000.sJGPCn217JcEiQA6cPfJpgm1qkdSl7G3I1a8b5i_wKM";

    expect(redirectUrl(await proxy(request("/", oldToken)))).toBe(
      "https://buddy.example/login",
    );
  });
});

describe("themeFontPreloadLinks", () => {
  test.each([
    ["no cookie", undefined, GRAVY_FALLS_PRELOADS],
    [
      "Ghost Hasslers",
      "ghost-hasslers.dark",
      ["typeface-oswald", "typeface-archivo", "typeface-jetbrains-mono"].map(
        fontPreload,
      ),
    ],
    [
      "Ay, Liens!",
      "ay-liens",
      ["typeface-martian-mono", "typeface-ibm-plex-sans"].map(fontPreload),
    ],
    ["a bad value", "nonsense", GRAVY_FALLS_PRELOADS],
  ])("preloads exactly the fonts of %s", (_case, cookie, preloads) => {
    expect(themeFontPreloadLinks(cookie).split(", ")).toEqual(preloads);
  });
});

describe("proxy font preloads", () => {
  test("sends the saved theme's preloads with a public page", async () => {
    const response = await proxy(request("/login", undefined, "ay-liens.dark"));

    expect(response.headers.get("link")).toBe(
      themeFontPreloadLinks("ay-liens.dark"),
    );
  });

  test("sends the default theme's preloads with a signed-in page", async () => {
    const token = await createSessionToken(user, secret, new Date());

    const response = await proxy(request("/", token));

    expect(response.headers.get("link")?.split(", ")).toEqual(
      GRAVY_FALLS_PRELOADS,
    );
  });

  test("sends none with an API request or a redirect", async () => {
    const token = await createSessionToken(user, secret, new Date());

    const api = await proxy(request("/api/chat", token, "ay-liens.dark"));
    const redirect = await proxy(request("/projects/1", undefined, "ay-liens"));

    expect(passesThrough(api)).toBe(true);
    expect(api.headers.get("link")).toBeNull();
    expect(redirectUrl(redirect)).toBe("https://buddy.example/login");
    expect(redirect.headers.get("link")).toBeNull();
  });
});

// A theme cookie's value, and the theme whose fonts it should preload.
interface CookieCase {
  readonly name: string;
  readonly value: string | undefined;
  readonly theme: ThemeId;
}

const COOKIE_CASES: readonly CookieCase[] = [
  { name: "no saved theme", value: undefined, theme: "gravy-falls" },
  {
    name: "Ghost Hasslers, dark",
    value: "ghost-hasslers.dark",
    theme: "ghost-hasslers",
  },
  { name: "Ay, Liens! with no mode", value: "ay-liens", theme: "ay-liens" },
  { name: "an unknown theme", value: "nonsense", theme: "gravy-falls" },
  ...THEME_IDS.map(
    (theme): CookieCase => ({
      name: `${theme}, dark`,
      value: `${theme}.dark`,
      theme,
    }),
  ),
];

// The saved theme's fonts start loading with the page: the sign-in page's
// response preloads exactly the theme's font files, each once.
describe("use_case_choose_theme", () => {
  test.each(COOKIE_CASES)(
    "the sign-in page preloads the fonts for $name",
    async ({ value, theme }) => {
      const preloads = fontPreloads(
        await proxy(request("/login", undefined, value)),
      );

      expect(new Set(preloads)).toEqual(new Set(themeFontUrls(theme)));
      expect(preloads).toHaveLength(THEME_TYPEFACES[theme].length);
    },
  );
});
