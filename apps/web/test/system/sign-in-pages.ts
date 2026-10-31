// Signing in and up through the site's pages, as a visitor does: asking for
// a link, reading it from the outbox (outbox.ts), and continuing on the
// page it opens. `logIn` in log-in.ts signs in without the pages, for tests
// about something else.
import { type BrowserContext, expect, type Page } from "@playwright/test";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { HOME_PATH } from "@/routes.ts";
import { LINK_PAGE_COPY, LOGIN_COPY } from "@/ui/copy/login.ts";
import { emailsTo, signInLinkIn, waitForEmailsTo } from "./outbox.ts";
import { fillWhenReady } from "./page-helpers.ts";

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const SESSION_DAYS = 30;
// How far a session's expiry may be from 30 days after the check: the time
// between signing in and checking.
const EXPIRY_SLACK_SECONDS = 120;

// The page's own status line, where a form says what it did.
function formStatus(page: Page): ReturnType<Page["getByRole"]> {
  return page.getByRole("main").getByRole("status");
}

// Asks for a sign-in link to address on the sign-in page, and checks the
// page says to check her email, as it does whether or not one is sent.
async function askForSignInLink(page: Page, address: string): Promise<void> {
  await page.goto("/login");
  await fillWhenReady(
    page.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    address,
  );
  await page.getByRole("button", { name: LOGIN_COPY.send }).click();
  await expect(formStatus(page)).toHaveText(LOGIN_COPY.checkEmail);
}

// Opens the link, and continues on the page it opens, which signs the
// page's browser in and shows the new chat page.
async function continueSignIn(page: Page, link: string): Promise<void> {
  await page.goto(link);
  await page.getByRole("button", { name: LINK_PAGE_COPY.continue }).click();
  await expect(page).toHaveURL(HOME_PATH);
}

// Asks for a sign-in link to address, waits for its email, and returns the
// link.
async function newSignInLink(page: Page, address: string): Promise<string> {
  const sentBefore = (await emailsTo(address)).length;
  await askForSignInLink(page, address);
  const emails = await waitForEmailsTo(address, sentBefore + 1);
  return signInLinkIn(emails[sentBefore]);
}

// Signs the page's browser in as address's account, through the pages.
async function signInByLink(page: Page, address: string): Promise<void> {
  await continueSignIn(page, await newSignInLink(page, address));
}

// Checks that the browser holds a session that lasts 30 days from now.
async function expectSignedInFor30Days(context: BrowserContext): Promise<void> {
  const session = (await context.cookies()).find(
    (cookie) => cookie.name === SESSION_COOKIE_NAME,
  );
  const thirtyDaysOn =
    Date.now() / MS_PER_SECOND + SESSION_DAYS * SECONDS_PER_DAY;
  expect(session?.expires).toBeGreaterThan(thirtyDaysOn - EXPIRY_SLACK_SECONDS);
  expect(session?.expires).toBeLessThan(thirtyDaysOn + EXPIRY_SLACK_SECONDS);
}

export {
  askForSignInLink,
  continueSignIn,
  expectSignedInFor30Days,
  formStatus,
  newSignInLink,
  signInByLink,
};
