// use-cases/accounts.md and access.md: making an account on the sign-up
// page with the invite code, and what a wrong invite code, a lockout,
// an existing address and too many requests do.
import { expect, type Page } from "@playwright/test";
import { findUserByEmail } from "@/accounts/users-store.ts";
import { MAX_FAILED_LOGINS } from "@/auth/failed-logins.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { test } from "./fixtures.ts";
import { emailsTo, signInLinkIn, waitForEmailsTo } from "./outbox.ts";
import { endLockout } from "./sign-in-clock.ts";
import {
  askForSignInLink,
  continueSignIn,
  formStatus,
  sendSignUp,
} from "./sign-in-pages.ts";

const WRONG_INVITE_CODE = "not the invite code";

// Signs up with a wrong invite code count times, one after another, each
// refused as wrong.
async function failSignUps(
  page: Page,
  address: string,
  count: number,
): Promise<void> {
  if (count === 0) {
    return;
  }
  await sendSignUp(page, address, WRONG_INVITE_CODE);
  await expect(page.getByText(SIGNUP_COPY.wrongInviteCode)).toBeVisible();
  await failSignUps(page, address, count - 1);
}

test("use_case_sign_up", async ({ newAddress, page }) => {
  await test.step("the sign-in page leads to the sign-up page", async () => {
    await page.goto("/login");
    await page.getByRole("link", { name: LOGIN_COPY.signUpLink }).click();

    await expect(page).toHaveURL("/signup");
    await expect(
      page.getByRole("link", { name: SIGNUP_COPY.signInLink }),
    ).toHaveAttribute("href", "/login");
  });

  await test.step("with the invite code and her address, the site says to check her email", async () => {
    await sendSignUp(page, newAddress);

    await expect(formStatus(page)).toHaveText(SIGNUP_COPY.checkEmail);
  });

  const [email] = await waitForEmailsTo(newAddress, 1);

  await test.step("she is not signed in until she follows the link", async () => {
    await page.goto("/projects");

    await expect(page).toHaveURL("/login");
  });

  await test.step("the email's link signs her in to her new account", async () => {
    await continueSignIn(page, signInLinkIn(email));

    expect(await findUserByEmail(newAddress)).toBeDefined();
    await page.goto("/projects");
    await expect(page).toHaveURL("/projects");
  });
});

test("use_case_sign_up_existing_email", async ({ account, page, testData }) => {
  const project = await testData.project();

  await test.step("the page answers as for a new address", async () => {
    await sendSignUp(page, account.email);

    await expect(formStatus(page)).toHaveText(SIGNUP_COPY.checkEmail);
  });

  await test.step("the email's link signs her in to the account she has", async () => {
    const [email] = await waitForEmailsTo(account.email, 1);
    await continueSignIn(page, signInLinkIn(email));

    await page.goto("/projects");
    await expect(page.getByText(project.name)).toBeVisible();
    expect((await findUserByEmail(account.email))?.id).toBe(account.id);
  });
});

test("use_case_sign_up_wrong_invite_code", async ({
  account,
  newAddress,
  page,
}) => {
  await test.step("the page says the invite code is wrong, keeping her address", async () => {
    await sendSignUp(page, newAddress, WRONG_INVITE_CODE);

    await expect(page.getByText(SIGNUP_COPY.wrongInviteCode)).toBeVisible();
    await expect(page.getByLabel(SIGNUP_COPY.inviteCodeLabel)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(
      page.getByRole("textbox", { name: SIGNUP_COPY.emailLabel }),
    ).toHaveValue(newAddress);
  });

  await test.step("no email is sent and no account is made", async () => {
    // An email asked for later, which arrives after any for newAddress.
    await askForSignInLink(page, account.email);
    await waitForEmailsTo(account.email, 1);

    expect(await emailsTo(newAddress)).toEqual([]);
    expect(await findUserByEmail(newAddress)).toBeUndefined();
  });

  await test.step("every other page still shows the sign-in page", async () => {
    await page.goto("/projects");

    await expect(page).toHaveURL("/login");
  });
});

test("use_case_sign_up_locked_out", async ({
  account,
  clientAddress,
  newAddress,
  page,
}) => {
  await test.step("too many wrong invite codes lock her out", async () => {
    await failSignUps(page, newAddress, MAX_FAILED_LOGINS);
  });

  await test.step("even the right invite code is refused, sending nothing", async () => {
    await sendSignUp(page, newAddress);

    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      SIGNUP_COPY.lockedOut,
    );
    await askForSignInLink(page, account.email);
    await waitForEmailsTo(account.email, 1);
    expect(await emailsTo(newAddress)).toEqual([]);
    expect(await findUserByEmail(newAddress)).toBeUndefined();
  });

  await test.step("after the wait, the right invite code works again", async () => {
    await endLockout(clientAddress);
    await sendSignUp(page, newAddress);

    await expect(formStatus(page)).toHaveText(SIGNUP_COPY.checkEmail);
    await waitForEmailsTo(newAddress, 1);
  });
});
