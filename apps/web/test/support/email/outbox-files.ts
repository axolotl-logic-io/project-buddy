// The emails the site under test sent: with EMAIL_TRANSPORT "outbox"
// (.env.test), each is a JSON file in EMAIL_OUTBOX_DIR, which
// src/email/outbox.ts writes, named by its idempotency key. For the
// end-to-end tests (test/system/outbox.ts) and the server tests. One of the
// files that may use Node's file system (biome.jsonc).

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
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

// An email's file; any other name is one src/email/outbox.ts is still writing.
const EMAIL_FILE = /\.json$/u;

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
    names
      .filter((name) => EMAIL_FILE.test(name))
      .map(async (name) =>
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

export type { OutboxEmail };
export { emailsTo };
