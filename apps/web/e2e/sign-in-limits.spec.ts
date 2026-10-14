// use-cases/accounts.md: asking for too many sign-in emails, for one
// address or from one connection. The page's answer never changes; past
// a limit, no email is sent until its window has passed.
import { expect, type Page } from "@playwright/test";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { test } from "./fixtures.ts";
import { emailsTo, signInLinkIn, waitForEmailsTo } from "./outbox.ts";
import {
  askForSignInLink,
  continueSignIn,
  formStatus,
  sendSignUp,
} from "./sign-in-pages.ts";

// The limits in use_case_too_many_sign_in_requests: emails to one address
// asked for from one connection, emails to one address from every
// connection, and requests from one connection.
const PER_ADDRESS_AND_CONNECTION = 3;
const PER_ADDRESS = 10;
const PER_CONNECTION = 20;

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

// From the second connection, which has asked for one email to address,
// asks for more until the address reaches its limit: the second
// connection's limit, then the first's, then the second's again. Each
// connection's own window for the address passes between, but the
// address's doesn't.
async function askUpToAddressLimit(
  page: Page,
  address: string,
  [first, second]: readonly [string, string],
): Promise<void> {
  await askTimes(page, address, PER_ADDRESS_AND_CONNECTION - 1);
  await endRateLimitWindowsFor({ address, clientKey: first });
  await connectFrom(page, first);
  await askTimes(page, address, PER_ADDRESS_AND_CONNECTION);
  await endRateLimitWindowsFor({ address, clientKey: second });
  await connectFrom(page, second);
  // Three connections' worth so far: the first step's, the second's, and
  // this first connection's.
  const sentSoFar = PER_ADDRESS_AND_CONNECTION + PER_ADDRESS_AND_CONNECTION * 2;
  await askTimes(page, address, PER_ADDRESS - sentSoFar);
}

test("use_case_too_many_sign_in_requests", async ({
  account,
  clientAddress,
  newAddress,
  otherAccount,
  otherClientAddress,
  page,
}) => {
  await test.step("past the limit for one address from one connection, the answer is the same and no email is sent", async () => {
    await askTimes(page, account.email, PER_ADDRESS_AND_CONNECTION);
    await waitForEmailsTo(account.email, PER_ADDRESS_AND_CONNECTION);

    await sendSignUp(page, account.email);
    await expect(formStatus(page)).toHaveText(SIGNUP_COPY.checkEmail);
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

  await test.step("past the limit for the address from every connection, no email is sent from any", async () => {
    await askUpToAddressLimit(page, account.email, [
      clientAddress,
      otherClientAddress,
    ]);
    await waitForEmailsTo(account.email, PER_ADDRESS);

    await askForSignInLink(page, account.email);
    // An email asked for later, which arrives after any more for account.
    await askForSignInLink(page, otherAccount.email);
    await waitForEmailsTo(otherAccount.email, 2);
    expect(await emailsTo(account.email)).toHaveLength(PER_ADDRESS);
  });

  await test.step("after the wait an email is sent, and the earlier links still work", async () => {
    await endRateLimitWindowsFor({ address: account.email });
    await connectFrom(page, clientAddress);
    await askForSignInLink(page, account.email);
    const emails = await waitForEmailsTo(account.email, PER_ADDRESS + 1);
    await continueSignIn(page, signInLinkIn(emails[0]));
  });

  await test.step("past the limit for one connection, no email is sent for any address", async () => {
    // This connection's requests so far: three, the sign-up and one to
    // otherAccount in the first step, three in the third and one in the
    // fourth; then enough to an address with no account to reach the limit.
    const askedSoFar = 2 * PER_ADDRESS_AND_CONNECTION + 2 + 1;
    await askTimes(page, newAddress, PER_CONNECTION - askedSoFar);
    await askForSignInLink(page, otherAccount.email);

    await endRateLimitWindowsFor({ clientKey: clientAddress });
    await askForSignInLink(page, account.email);
    await waitForEmailsTo(account.email, PER_ADDRESS + 2);
    expect(await emailsTo(otherAccount.email)).toHaveLength(2);
  });
});
