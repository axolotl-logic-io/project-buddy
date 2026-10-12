// The emails the site under test sent: with EMAIL_TRANSPORT "outbox"
// (.env.test), each is a JSON file in EMAIL_OUTBOX_DIR, which
// src/email/outbox.ts writes, and Playwright empties at the start of every
// run. One of the two files that may use Node's file system (biome.jsonc).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { z } from "zod";
import { readEmailOutboxDir } from "@/env.ts";

const OUTBOX_EMAIL = z.object({
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
  sentAt: z.iso.datetime(),
});

type OutboxEmail = z.infer<typeof OUTBOX_EMAIL>;

// The sign-in link in an email's text.
const SIGN_IN_LINK = /https?:\/\/\S+\/login\/link\?token=[\w-]+/u;

// Every email in the outbox, or none if the site has sent none yet.
async function everyEmail(): Promise<OutboxEmail[]> {
  const directory = readEmailOutboxDir();
  const names = await readdir(directory).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  });
  return Promise.all(
    names.map(async (name) =>
      OUTBOX_EMAIL.parse(
        JSON.parse(await readFile(join(directory, name), "utf8")),
      ),
    ),
  );
}

// The emails sent to address so far, oldest first.
async function emailsTo(address: string): Promise<OutboxEmail[]> {
  const emails = await everyEmail();
  return emails
    .filter((email) => email.to === address)
    .toSorted((first, second) => first.sentAt.localeCompare(second.sentAt));
}

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

export type { OutboxEmail };
export { emailsTo, signInLinkIn, waitForEmailsTo };
