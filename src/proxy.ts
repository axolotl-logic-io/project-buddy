import { type NextRequest, NextResponse } from "next/server";
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
  SIGN_IN_PATH,
} from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";

// The pages anyone may open: signing in, signing up, and the link a sign-in
// email holds. Their Server Actions post to the same paths.
const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  SIGN_IN_PATH,
  "/signup",
  "/login/link",
]);

// Every other page and API route requires a session cookie that is signed
// and unexpired. The proxy reads no database: whether the session's user
// and epoch are still current is checked by src/auth/current-user.ts. Without
// one, a page redirects to the sign-in page and an API route answers 401
// with the signed-out case, which the chat shows as such.
export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await readSessionToken(
    token,
    readSessionSecret(),
    new Date(),
  );
  if (session !== undefined) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
  }
  return NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
