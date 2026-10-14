import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  type SessionUser,
} from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";

type Cookie = Parameters<BrowserContext["addCookies"]>[0][number];

// A session for account, as signing in starts one, but not `Secure`, as
// the site's is: WebKit, which the iPhone tests run on, drops Secure cookies
// on http://localhost. Tests about anything but signing in sign in with a
// session they make themselves, which skips the email and its link; the
// tests of signing in go through the pages (e2e/sign-in-pages.ts).
export async function testSessionCookie(
  account: SessionUser,
  baseUrl: string,
): Promise<Cookie> {
  return {
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(account, readSessionSecret(), new Date()),
    url: baseUrl,
    httpOnly: true,
    sameSite: "Lax",
  };
}

// Signs the page's browser in as account, and opens the home page.
export async function logIn(page: Page, account: SessionUser): Promise<void> {
  const { baseURL } = test.info().project.use;
  if (baseURL === undefined) {
    throw new Error("Signing in needs the config's baseURL");
  }
  await page.context().addCookies([await testSessionCookie(account, baseURL)]);
  await page.goto("/");
  await expect(page).toHaveURL("/");
}
