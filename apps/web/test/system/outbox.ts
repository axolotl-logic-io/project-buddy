// Waiting for the emails the site under test sent, and the links in them.
// The outbox's files are read by test/support/email/outbox-files.ts.
import { expect } from "@playwright/test";
import { emailsTo, type OutboxEmail } from "../support/email/outbox-files.ts";

// The setup link in an invitation email's text.
const SETUP_LINK = /https?:\/\/\S+\/setup\?token=[\w-]+/u;

// The sign-in link in an email's text.
const SIGN_IN_LINK = /https?:\/\/\S+\/login\/link\?token=[\w-]+/u;

// Waits until count emails have been sent to address, and returns them,
// oldest first. The site sends each after its response, so it may arrive a
// moment after the page says to check her email.
async function waitForEmailsTo(
  address: string,
  count: number,
): Promise<OutboxEmail[]> {
  await expect
    .poll(async () => (await emailsTo(address)).length, {
      message: `${count} emails to ${address}`,
    })
    .toBe(count);
  return emailsTo(address);
}

// The sign-in link the email holds, which must be there.
function signInLinkIn(email: OutboxEmail | undefined): string {
  const [link] = SIGN_IN_LINK.exec(email?.text ?? "") ?? [];
  if (link === undefined) {
    throw new Error(`No sign-in link in the email "${email?.subject}"`);
  }
  return link;
}

function setupLinkIn(email: OutboxEmail | undefined): string {
  const [link] = SETUP_LINK.exec(email?.text ?? "") ?? [];
  if (link === undefined) {
    throw new Error("No setup link in the invitation email");
  }
  return link;
}

export { setupLinkIn, signInLinkIn, waitForEmailsTo };
