import { expect } from "@playwright/test";
import { findUserByEmail } from "@/accounts/users-store.ts";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { HOME_PATH } from "@/routes.ts";
import { LINK_PAGE_COPY, LOGIN_COPY } from "@/ui/copy/login.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { test } from "./fixtures.ts";
import { signInLinkIn, waitForEmailsTo } from "./outbox.ts";
import { fillWhenReady } from "./page-helpers.ts";
import {
  continueSignIn,
  expectSignedInFor30Days,
  formStatus,
} from "./sign-in-pages.ts";

test("use_case_sign_up", async ({ context, newAddress, page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: LOGIN_COPY.signUpLink }).click();
  await expect(page.getByText(SIGNUP_COPY.intro)).toBeVisible();
  await fillWhenReady(
    page.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    newAddress,
  );
  await page.getByRole("button", { name: LOGIN_COPY.send }).click();
  await expect(formStatus(page)).toHaveText(LOGIN_COPY.checkEmail);
  const [email] = await waitForEmailsTo(newAddress, 1);
  await page.goto(signInLinkIn(email));
  await expect(
    page.getByRole("button", { name: LINK_PAGE_COPY.continue }),
  ).toBeVisible();
  expect(await findUserByEmail(newAddress)).toBeUndefined();
  expect(
    (await context.cookies()).find(
      (cookie) => cookie.name === SESSION_COOKIE_NAME,
    ),
  ).toBeUndefined();
  await page.getByRole("button", { name: LINK_PAGE_COPY.continue }).click();
  await expect(page).toHaveURL(HOME_PATH);
  expect((await findUserByEmail(newAddress))?.role).toBe("user");
  await expectSignedInFor30Days(context);
});

test("use_case_sign_up_existing_email", async ({ account, page, testData }) => {
  const quest = await testData.quest();
  const before = await findUserByEmail(account.email);
  await page.goto("/signup");
  await fillWhenReady(
    page.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    account.email.toUpperCase(),
  );
  await page.getByRole("button", { name: LOGIN_COPY.send }).click();
  await expect(formStatus(page)).toHaveText(LOGIN_COPY.checkEmail);
  const [email] = await waitForEmailsTo(account.email, 1);
  await continueSignIn(page, signInLinkIn(email));
  await page.goto("/quests");
  await expect(page.getByText(quest.name)).toBeVisible();
  expect(await findUserByEmail(account.email)).toEqual(before);
});
