import { type NextRequest, NextResponse } from "next/server";
import { readSessionSecret } from "@/env";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/auth/session-token";

// The login page's Server Action posts to /login, so this also admits the
// submit handler.
const LOGIN_PATH = "/login";

// Every page and API route requires a valid session cookie, except /login.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isValidSessionToken(token, readSessionSecret(), new Date())) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
