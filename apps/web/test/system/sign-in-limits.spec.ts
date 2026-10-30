// use-cases/accounts.md: asking for too many sign-in emails for one
// address from one connection, through the sign-in page. The page's answer
// never changes; past the limit, no email is sent until its window has
// passed. rate-limits.server.test.ts counts every limit against the test
// database, including the address's from every connection and the
// connection's for every address.
import { expect, type Page } from "@playwright/test";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { test } from "./fixtures.ts";
import { emailsTo, signInLinkIn, waitForEmailsTo } from "./outbox.ts";
import {
  askForSignInLink,
  continueSignIn,
  formStatus,
} from "./sign-in-pages.ts";

// The limit in use_case_too_many_sign_in_requests on emails to one address
// asked for from one connection.
const PER_ADDRESS_AND_CONNECTION = 3;

// Asks for a sign-in link to address count times, one after another.
async function askTimes(
  page: Page,
  address: string,
  count: number,
): Promise<void> {
  if (count === 0) {
    return;
  }
  await askForSignInLink(page, address);
  await askTimes(page, address, count - 1);
}

// The page's requests come from clientAddress from now on.
async function connectFrom(page: Page, clientAddress: string): Promise<void> {
  await page
    .context()
    .setExtraHTTPHeaders({ "x-forwarded-for": clientAddress });
}

test("use_case_too_many_sign_in_requests", async ({
  account,
  clientAddress,
  otherAccount,
  otherClientAddress,
  page,
}) => {
  await test.step("past the limit for one address from one connection, the answer is the same and no email is sent", async () => {
    await askTimes(page, account.email, PER_ADDRESS_AND_CONNECTION);
    await waitForEmailsTo(account.email, PER_ADDRESS_AND_CONNECTION);

    await askForSignInLink(page, account.email);
    await expect(formStatus(page)).toHaveText(LOGIN_COPY.checkEmail);
    // An email asked for later, which arrives after any more for account.
    await askForSignInLink(page, otherAccount.email);
    await waitForEmailsTo(otherAccount.email, 1);
    expect(await emailsTo(account.email)).toHaveLength(
      PER_ADDRESS_AND_CONNECTION,
    );
  });

  await test.step("from another connection, an email to that address is still sent", async () => {
    await connectFrom(page, otherClientAddress);
    await askForSignInLink(page, account.email);
    await waitForEmailsTo(account.email, PER_ADDRESS_AND_CONNECTION + 1);
  });

  await test.step("after the wait an email is sent, and the earlier links still work", async () => {
    await endRateLimitWindowsFor({ address: account.email });
    await connectFrom(page, clientAddress);
    await askForSignInLink(page, account.email);
    const emails = await waitForEmailsTo(
      account.email,
      PER_ADDRESS_AND_CONNECTION + 2,
    );
    await continueSignIn(page, signInLinkIn(emails[0]));
  });
});
