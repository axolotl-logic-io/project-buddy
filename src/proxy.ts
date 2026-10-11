import { type NextRequest, NextResponse } from "next/server";
import {
  isValidSessionToken,
  SESSION_COOKIE_NAME,
} from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";

// The login page's Server Action posts to /login, so this also admits the
// submit handler.
const LOGIN_PATH = "/login";

// Every page and API route requires a valid session cookie, except /login.
// Without one, a page redirects to /login and an API route answers 401 with
// the signed-out case, which the chat shows as such.
export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;
  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await isValidSessionToken(token, readSessionSecret(), new Date())) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
  }
  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
