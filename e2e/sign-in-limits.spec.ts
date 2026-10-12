// use-cases/accounts.md: asking for too many sign-in emails, for one
// address or from one connection. The page's answer never changes; past
// the limit, no email is sent until the window has passed.
import { expect, type Page } from "@playwright/test";
import {
  addressRateLimitKey,
  clientRateLimitKey,
  LOGIN_LINK_LIMITS,
} from "@/accounts/rate-limits.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import { test } from "./fixtures.ts";
import { emailsTo, signInLinkIn, waitForEmailsTo } from "./outbox.ts";
import { endRateLimitWindow } from "./sign-in-clock.ts";
import {
  askForSignInLink,
  continueSignIn,
  formStatus,
  sendSignUp,
} from "./sign-in-pages.ts";

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

test("use_case_too_many_sign_in_requests", async ({
  account,
  clientAddress,
  newAddress,
  otherAccount,
  page,
}) => {
  const perAddress = LOGIN_LINK_LIMITS.address.requests;

  await test.step("past the limit for one address, the answer is the same and no email is sent", async () => {
    await askTimes(page, account.email, perAddress);
    await waitForEmailsTo(account.email, perAddress);

    await sendSignUp(page, account.email);
    await expect(formStatus(page)).toHaveText(SIGNUP_COPY.checkEmail);
    // An email asked for later, which arrives after any more for account.
    await askForSignInLink(page, otherAccount.email);
    await waitForEmailsTo(otherAccount.email, 1);
    expect(await emailsTo(account.email)).toHaveLength(perAddress);
  });

  await test.step("after the wait an email is sent, and the earlier links still work", async () => {
    await endRateLimitWindow(addressRateLimitKey(account.email));
    await askForSignInLink(page, account.email);

    const emails = await waitForEmailsTo(account.email, perAddress + 1);
    await continueSignIn(page, signInLinkIn(emails[0]));
  });

  await test.step("past the limit for one connection, no email is sent for any address", async () => {
    const perClient = LOGIN_LINK_LIMITS.client.requests;
    // The requests so far, and enough for an address with no account to
    // reach the limit.
    const asked = perAddress + 2 + 1;
    await askTimes(page, newAddress, perClient - asked);
    const sentBefore = (await emailsTo(otherAccount.email)).length;

    await askForSignInLink(page, otherAccount.email);

    await endRateLimitWindow(clientRateLimitKey(clientAddress));
    await askForSignInLink(page, account.email);
    await waitForEmailsTo(account.email, perAddress + 2);
    expect(await emailsTo(otherAccount.email)).toHaveLength(sentBefore);
  });
});
