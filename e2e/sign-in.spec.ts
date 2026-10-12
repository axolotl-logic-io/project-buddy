// use-cases/accounts.md: signing in by an emailed link, on this device or
// another, and what happens to a link that is late or used again. Another
// device is a new browser context, which shares nothing with the test's.
import { expect } from "@playwright/test";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { LINK_PAGE_COPY, LOGIN_COPY } from "@/ui/copy/login.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { test } from "./fixtures.ts";
import { emailsTo, signInLinkIn, waitForEmailsTo } from "./outbox.ts";
import { expireLoginLinksOf } from "./sign-in-clock.ts";
import {
  askForSignInLink,
  continueSignIn,
  expectSignedInFor30Days,
  newSignInLink,
  signInByLink,
} from "./sign-in-pages.ts";

test("use_case_sign_in_by_link", async ({
  account,
  browser,
  newAddress,
  page,
  testData,
}) => {
  const project = await testData.project();

  await test.step("the sign-in page asks only for her email address", async () => {
    await page.goto("/login");

    await expect(page.getByRole("textbox")).toHaveCount(1);
    await expect(
      page.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: LOGIN_COPY.signUpLink }),
    ).toHaveAttribute("href", "/signup");
  });

  await test.step("she asks for a link, and an email holds it", async () => {
    await askForSignInLink(page, account.email);

    const [email] = await waitForEmailsTo(account.email, 1);
    expect(email?.from).toBe(`${SITE_COPY.name} <bot@axolotl-logic.io>`);
  });

  const device = await browser.newContext();
  const phone = await device.newPage();
  const [email] = await emailsTo(account.email);
  const link = signInLinkIn(email);

  await test.step("opening the link alone signs no one in", async () => {
    await phone.goto(link);

    await expect(phone.getByText(LINK_PAGE_COPY.intro)).toBeVisible();
    const cookies = await device.cookies();
    expect(cookies.map((cookie) => cookie.name)).not.toContain(
      SESSION_COOKIE_NAME,
    );
  });

  await test.step("continuing on another device signs her in there for 30 days", async () => {
    await phone.getByRole("button", { name: LINK_PAGE_COPY.continue }).click();

    await expect(phone).toHaveURL("/");
    await expectSignedInFor30Days(device);
    await phone.goto("/projects");
    await expect(phone.getByText(project.name)).toBeVisible();
  });
  await device.close();

  await test.step("an address with no account gets the same answer, and no email", async () => {
    await askForSignInLink(page, newAddress);
    // A later email, which arrives after any for newAddress would have.
    await askForSignInLink(page, account.email);

    await waitForEmailsTo(account.email, 2);
    expect(await emailsTo(newAddress)).toEqual([]);
  });
});

test("use_case_sign_in_link_reused", async ({
  account,
  browser,
  context,
  page,
}) => {
  const link = await newSignInLink(page, account.email);
  await continueSignIn(page, link);

  await test.step("the same link signs her in on another device", async () => {
    const device = await browser.newContext();
    const phone = await device.newPage();

    await continueSignIn(phone, link);

    await expectSignedInFor30Days(device);
    await device.close();
  });

  await test.step("the first browser stays signed in", async () => {
    await page.goto("/projects");

    await expect(page).toHaveURL("/projects");
  });

  await test.step("it signs her in again in the same browser after signing out", async () => {
    await context.clearCookies({ name: SESSION_COOKIE_NAME });
    await page.goto("/projects");
    await expect(page).toHaveURL("/login");

    await continueSignIn(page, link);

    await page.goto("/projects");
    await expect(
      page.getByRole("heading", { level: 1, name: PROJECTS_COPY.heading }),
    ).toBeVisible();
  });
});

test("use_case_sign_in_link_expired", async ({ account, page }) => {
  const link = await newSignInLink(page, account.email);

  await test.step("a late link says it has expired, with the sign-in page's link", async () => {
    await expireLoginLinksOf(account.id);
    await page.goto(link);

    await expect(page.getByText(LINK_PAGE_COPY.expired)).toBeVisible();
    await expect(
      page.getByRole("button", { name: LINK_PAGE_COPY.continue }),
    ).toHaveCount(0);
  });

  await test.step("she is still signed out", async () => {
    await page.goto("/projects");

    await expect(page).toHaveURL("/login");
  });

  await test.step("a link that expires while its page is open says so on continuing", async () => {
    const fresh = await newSignInLink(page, account.email);
    await page.goto(fresh);
    await expireLoginLinksOf(account.id);

    await page.getByRole("button", { name: LINK_PAGE_COPY.continue }).click();

    await expect(page.getByText(LINK_PAGE_COPY.expired)).toBeVisible();
  });

  await test.step("a new link from the sign-in page signs her in", async () => {
    await page.getByRole("link", { name: LINK_PAGE_COPY.newLink }).click();
    await expect(page).toHaveURL("/login");

    await signInByLink(page, account.email);

    await page.goto("/projects");
    await expect(page).toHaveURL("/projects");
  });
});
