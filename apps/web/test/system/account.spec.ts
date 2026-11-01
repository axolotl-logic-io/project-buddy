// use-cases/accounts.md: signing out of one browser or of every one, from
// the account page. Another browser is a new browser context, which shares
// nothing with the test's. The page's usage and name are server and
// component tests in src/app/(workspace)/account/.
import {
  type Browser,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import { userMessage } from "@/errors/app-error.ts";
import { HOME_PATH } from "@/routes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";
import { sendMessage } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { alertIn } from "./page-helpers.ts";
import { newSignInLink, signInByLink } from "./sign-in-pages.ts";

// A page in another browser, signed in as account, at address.
async function anotherBrowser(
  browser: Browser,
  account: User,
  address: string,
): Promise<Page> {
  const other = await (await browser.newContext()).newPage();
  await logIn(other, account);
  await other.goto(address);
  return other;
}

test("use_case_sign_out", async ({ account, browser, page }) => {
  const link = await newSignInLink(page, account.email);
  await logIn(page, account);
  await page.goto("/account");
  const other = await anotherBrowser(browser, account, "/projects");

  await test.step("Sign out shows the sign-in page", async () => {
    await page
      .getByRole("button", { exact: true, name: ACCOUNT_COPY.signOut })
      .click();

    await expect(page).toHaveURL("/login");
  });

  await test.step("every page in this browser shows the sign-in page", async () => {
    await page.goto("/projects");
    await expect(page).toHaveURL("/login");
    await page.goto("/account");
    await expect(page).toHaveURL("/login");
  });

  await test.step("her other browser stays signed in", async () => {
    await other.reload();

    await expect(other).toHaveURL("/projects");
  });
  await other.context().close();

  await test.step("a link from the last 30 minutes still signs her in", async () => {
    await page.goto(link);
    await page.getByRole("button", { name: LINK_PAGE_COPY.continue }).click();

    await expect(page).toHaveURL(HOME_PATH);
    await page.goto("/account");
    await expect(page).toHaveURL("/account");
  });
});

// The dialog Sign out everywhere opens, to confirm.
function signOutEverywhereDialog(page: Page): Locator {
  return page.getByRole("alertdialog", {
    name: ACCOUNT_COPY.signOutEverywhereTitle,
  });
}

// On the account page, presses Sign out everywhere, and checks the dialog
// says what it does before she answers it with answer.
async function answerSignOutEverywhere(
  page: Page,
  answer: string,
): Promise<void> {
  const dialog = signOutEverywhereDialog(page);
  await page
    .getByRole("button", { name: ACCOUNT_COPY.signOutEverywhere })
    .click();
  await expect(dialog).toHaveAccessibleDescription(
    ACCOUNT_COPY.signOutEverywhereDescription,
  );
  await dialog.getByRole("button", { name: answer }).click();
}

test("use_case_sign_out_everywhere", async ({
  account,
  browser,
  page,
  testData,
}) => {
  const chat = await testData.chat(await testData.project());
  const link = await newSignInLink(page, account.email);
  await logIn(page, account);
  await page.goto("/account");
  const other = await anotherBrowser(browser, account, `/chats/${chat.id}`);

  await test.step("cancelling changes nothing", async () => {
    await answerSignOutEverywhere(page, ACCOUNT_COPY.stay);

    await expect(signOutEverywhereDialog(page)).toBeHidden();
    await page.reload();
    await expect(page).toHaveURL("/account");
  });

  await test.step("once she confirms, this browser shows the sign-in page", async () => {
    await answerSignOutEverywhere(page, ACCOUNT_COPY.signOutEverywhere);

    await expect(page).toHaveURL("/login");
  });

  await test.step("the chat left open in the other browser says she was signed out", async () => {
    await sendMessage(other, "Still there?");

    await expect(alertIn(other)).toContainText(userMessage("signed-out"));
  });

  await test.step("the other browser shows the sign-in page at its next page", async () => {
    await other.goto("/projects");

    await expect(other).toHaveURL("/login");
  });
  await other.context().close();

  await test.step("a link sent before no longer signs her in", async () => {
    await page.goto(link);

    await expect(page.getByText(LINK_PAGE_COPY.expired)).toBeVisible();
    await expect(
      page.getByRole("button", { name: LINK_PAGE_COPY.continue }),
    ).toHaveCount(0);
  });

  await test.step("a new link signs her in as usual", async () => {
    await signInByLink(page, account.email);

    await page.goto("/account");
    await expect(page).toHaveURL("/account");
  });
});
