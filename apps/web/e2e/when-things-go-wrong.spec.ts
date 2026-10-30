// "use_case_session_expired" in use-cases/access.md: the signed-out access
// gate for a session that lapsed, an auth workflow, so it stays in
// Playwright (e2e-auth-only). The other failure cases are
// Vitest's: test/errors/missing-page.server.test.ts,
// test/app/api/chat/reply-failures.server.test.ts and the
// storage-unavailable.server.test.ts files.
import { type BrowserContext, expect, type Page } from "@playwright/test";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  type SessionUser,
} from "@/auth/session-token.ts";
import { readSessionSecret } from "@/env.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { expectSignedInFor30Days, signInByLink } from "./sign-in-pages.ts";

const MS_PER_DAY = 86_400_000;
const DAYS_SINCE_LAST_SIGN_IN = 31;

// Swaps the browser's session for one of account's that lapsed long ago,
// as if she had signed in more than a month before.
async function expireSession(
  context: BrowserContext,
  page: Page,
  account: SessionUser,
): Promise<void> {
  const signedInAt = new Date(
    Date.now() - DAYS_SINCE_LAST_SIGN_IN * MS_PER_DAY,
  );
  const value = await createSessionToken(
    account,
    readSessionSecret(),
    signedInAt,
  );
  await context.clearCookies();
  await context.addCookies([
    { name: SESSION_COOKIE_NAME, value, url: new URL(page.url()).origin },
  ]);
}

test("use_case_session_expired", async ({ account, context, page }) => {
  await logIn(page, account);
  await expireSession(context, page, account);

  await test.step("every page shows the sign-in page", async () => {
    await page.goto("/projects");
    await expect(page).toHaveURL("/login");

    await page.goto(`/chats/${crypto.randomUUID()}`);
    await expect(page).toHaveURL("/login");
  });

  await test.step("signing in again lasts another 30 days", async () => {
    await signInByLink(page, account.email);

    await expectSignedInFor30Days(context);
    await page.goto("/projects");
    await expect(page).toHaveURL("/projects");
  });
});
