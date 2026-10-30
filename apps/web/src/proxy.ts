import { type NextRequest, NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import {
  parseThemeChoiceCookie,
  THEME_COOKIE_NAME,
} from "@/themes/theme-choice.ts";
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";

// The pages anyone may open: signing in, signing up, and the link a sign-in
// email holds, plus Credits. Their Server Actions post to the same paths.
const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  SIGN_IN_PATH,
  "/credits",
  "/signup",
  "/setup",
  "/login/link",
]);

// The `Link` header value that preloads each font of the theme a theme
// cookie's value saves; no cookie, or a bad one, is the default theme.
function themeFontPreloadLinks(cookieValue: string | undefined): string {
  const { theme } = parseThemeChoiceCookie(cookieValue);
  return THEME_TYPEFACES[theme]
    .flatMap((typeface) => {
      const url = TYPEFACE_FONT_URLS[typeface];
      if (url === undefined) {
        return [];
      }
      return [`<${url}>; rel=preload; as=font; type="font/woff2"; crossorigin`];
    })
    .join(", ");
}

// Lets a page request through with its theme's font preload hints, after
// any `Link` the response already has.
function nextPage(request: NextRequest): Response {
  const response = NextResponse.next();
  response.headers.append(
    "link",
    themeFontPreloadLinks(request.cookies.get(THEME_COOKIE_NAME)?.value),
  );
  return response;
}

// Every other page and API route requires a session cookie that is signed
// and unexpired. The proxy reads no database: whether the session's user
// and epoch are still current is checked by src/auth/current-user.ts. Without
// one, a page redirects to the sign-in page and an API route answers 401
// with the signed-out case, which the chat shows as such.
//
// Every page it lets through also gets a `Link` header that preloads the
// fonts of the theme saved in the theme cookie (themeFontPreloadLinks), so
// they start loading with the page while the HTML stays the same for every
// visitor (theme-font-urls.ts).
export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  if (PUBLIC_PATHS.has(pathname)) {
    return nextPage(request);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await readSessionToken(
    token,
    readSessionSecret(),
    new Date(),
  );
  if (session !== undefined && isApi) {
    return NextResponse.next();
  }
  if (session !== undefined) {
    return nextPage(request);
  }

  if (isApi) {
    return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
  }
  return NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export { themeFontPreloadLinks };
