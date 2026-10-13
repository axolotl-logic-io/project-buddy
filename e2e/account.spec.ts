// use-cases/accounts.md: the account page, with this month's spend out of
// the quota, and signing out of one browser or of every one. Another
// browser is a new browser context, which shares nothing with the test's.
import {
  type Browser,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import { userMessage } from "@/errors/app-error.ts";
import { formatResetDay, quotaResetsOn } from "@/quota/quota-terms.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import {
  exchange,
  expectMessages,
  personaName,
  sendMessage,
} from "./chat-page.ts";
import { spend, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { switchExtra } from "./settings-page.ts";
import { newSignInLink, signInByLink } from "./sign-in-pages.ts";

const DOLLAR_AND_A_QUARTER = 1_250_000;
const MESSAGE = "Bevel a donut";

// The page's own alert. Next's route announcer is an alert too, outside the
// main landmark.
function alertIn(page: Page): Locator {
  return page.getByRole("main").getByRole("alert");
}

// Opens the account page from the header, as she does from any page.
async function openAccountPage(page: Page): Promise<void> {
  await page
    .getByRole("banner")
    .getByRole("link", { name: ACCOUNT_COPY.headerLink })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: ACCOUNT_COPY.heading }),
  ).toBeVisible();
}

// Checks the page offers both ways to sign out.
async function expectSignOutButtons(page: Page): Promise<void> {
  await expect(
    page.getByRole("button", { exact: true, name: ACCOUNT_COPY.signOut }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: ACCOUNT_COPY.signOutEverywhere }),
  ).toBeVisible();
}

// Checks the page shows the spend as "<spent> of $5.00" on a meter, and the
// 1st of next month, in UTC, as the day it resets.
async function expectUsage(page: Page, spent: string): Promise<void> {
  const usage = ACCOUNT_COPY.usage(spent, "$5.00");
  await expect(page.getByText(usage)).toBeVisible();
  await expect(
    page.getByRole("meter", { name: ACCOUNT_COPY.usageHeading }),
  ).toHaveAttribute("aria-valuetext", usage);
  const resetDay = formatResetDay(quotaResetsOn(new Date()));
  await expect(page.getByText(ACCOUNT_COPY.resetsOn(resetDay))).toBeVisible();
}

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

test("use_case_see_monthly_usage", async ({ account, page, testData }) => {
  const chat = await testData.chat(await testData.project());
  await spend(account, DOLLAR_AND_A_QUARTER);
  await logIn(page, account);
  await page.goto("/");

  await test.step("her account page shows her spend out of $5, and the reset day", async () => {
    await openAccountPage(page);

    await expectUsage(page, "$1.25");
    await expectSignOutButtons(page);
  });

  await test.step("after a message and its reply, the spend has grown", async () => {
    await page.goto(`/chats/${chat.id}`);
    await sendMessage(page, MESSAGE);
    await expectMessages(page, exchange(personaName(chat.personaId), MESSAGE));
    await openAccountPage(page);

    // A reply from the mock tutor costs a fraction of a cent, which the
    // page rounds up.
    await expectUsage(page, "$1.26");
  });

  await test.step("with the meter switched off, the buttons still show", async () => {
    await switchExtra(page, FLAG_COPY.usageMeter.label, false, ["usage-meter"]);
    await page.goto("/account");

    await expect(page.getByRole("meter")).toHaveCount(0);
    await expect(
      page.getByText(ACCOUNT_COPY.usage("$1.26", "$5.00")),
    ).toBeHidden();
    await expectSignOutButtons(page);
  });
});

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

    await expect(page).toHaveURL("/");
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
