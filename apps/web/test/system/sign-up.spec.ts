// Admin invitations replace the former shared-code sign-up workflow.
import { expect, type Page } from "@playwright/test";
import { findUserByEmail, type User } from "@/accounts/users-store.ts";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { INVITATIONS_COPY, SETUP_COPY } from "@/ui/copy/invitations.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { promoteToAdmin } from "../support/test-database/user-test-kit.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import {
  emailsTo,
  setupLinkIn,
  signInLinkIn,
  waitForEmailsTo,
} from "./outbox.ts";
import { fillWhenReady } from "./page-helpers.ts";
import { continueSignIn, formStatus } from "./sign-in-pages.ts";

async function openInvitations(page: Page, account: User): Promise<void> {
  await logIn(page, await promoteToAdmin(account));
  await page.goto("/account");
  await page.getByRole("link", { name: INVITATIONS_COPY.heading }).click();
  await expect(page).toHaveURL("/invitations");
}

async function sendInvite(page: Page, email: string): Promise<void> {
  await fillWhenReady(
    page.getByRole("textbox", { name: INVITATIONS_COPY.emailLabel }),
    email,
  );
  await page.getByRole("button", { name: INVITATIONS_COPY.send }).click();
  await expect(formStatus(page)).toHaveText(INVITATIONS_COPY.sent);
}

// What the database holds at each step, and a used link refused, are
// invitations.server.test.ts's; this walks the recipient's browser.
test("use_case_sign_up", async ({ account, browser, newAddress, page }) => {
  await openInvitations(page, account);
  await sendInvite(page, newAddress);
  const [email] = await waitForEmailsTo(newAddress, 1);
  const link = setupLinkIn(email);
  const recipient = await browser.newContext();
  try {
    const other = await recipient.newPage();
    await other.goto(link);
    await expect(other.getByText(newAddress)).toBeVisible();
    expect(
      (await recipient.cookies()).find(
        (cookie) => cookie.name === SESSION_COOKIE_NAME,
      ),
    ).toBeUndefined();
    await other.getByRole("button", { name: SETUP_COPY.confirm }).click();
    await expect(other).toHaveURL("/");
    await other.goto("/account");
    await expect(
      other.getByRole("link", { name: INVITATIONS_COPY.heading }),
    ).toHaveCount(0);
  } finally {
    await recipient.close();
  }
});

test("use_case_sign_up_requires_invitation", async ({ newAddress, page }) => {
  await page.goto("/signup");
  await expect(page.getByText(SIGNUP_COPY.intro)).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: SIGNUP_COPY.signInLink }),
  ).toHaveAttribute("href", "/login");
  expect(await findUserByEmail(newAddress)).toBeUndefined();
  expect(await emailsTo(newAddress)).toEqual([]);
});

// Ordinary users' and signed-out sessions' refusals are
// invitations-access.server.test.ts's.
test("use_case_admin_invites", async ({ account, newAddress, page }) => {
  await openInvitations(page, account);
  await sendInvite(page, newAddress);

  const [email] = await waitForEmailsTo(newAddress, 1);
  expect(() => setupLinkIn(email)).not.toThrow();
  expect(await findUserByEmail(newAddress)).toBeUndefined();
});

test("use_case_sign_up_existing_email", async ({
  account,
  otherAccount,
  page,
  testData,
}) => {
  const project = await testData.project();
  const before = await findUserByEmail(account.email);
  await openInvitations(page, otherAccount);
  // HTML email inputs strip outer whitespace themselves. Raw padded direct
  // submissions are covered by the server test.
  await sendInvite(page, account.email.toUpperCase());
  const [email] = await waitForEmailsTo(account.email, 1);
  await continueSignIn(page, signInLinkIn(email));
  await page.goto("/projects");
  await expect(page.getByText(project.name)).toBeVisible();
  expect(await findUserByEmail(account.email)).toEqual(before);
});
