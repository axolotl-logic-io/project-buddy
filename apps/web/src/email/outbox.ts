// The end-to-end tests' email transport: each email becomes a JSON file in
// the outbox folder, which test/system/outbox.ts reads. One of the two files that
// may use Node's file system (biome.jsonc); only send-email.ts imports it.
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type EmailMessage, emailSender } from "@/email/email-message.ts";

// What an idempotency key may keep in a file name.
const UNSAFE_FILE_NAME_CHARACTERS = /[^\w.-]/gu;

// Writes the message to `<directory>/<its idempotency key>.json`, as
// `{ from, to, subject, text, html, sentAt }`, sentAt in ISO 8601. A message
// sent again with the same key overwrites its file, so the outbox holds it
// once, as Resend sends it once.
//
// The file appears whole or not at all: the message is written to a temporary
// file of its own (`<name>.<uuid>.tmp`) and renamed into place, because the
// tests read the outbox while other tests' emails are being written, and a
// plain write shows them an empty or half-written file. Two writes under one
// key each rename their own file, so the last one wins.
export async function writeToOutbox(
  message: EmailMessage,
  directory: string,
): Promise<void> {
  const fileName = `${message.idempotencyKey.replaceAll(UNSAFE_FILE_NAME_CHARACTERS, "-")}.json`;
  const path = join(directory, fileName);
  const writingPath = `${path}.${crypto.randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true });
  await writeFile(
    writingPath,
    JSON.stringify({
      from: emailSender(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      sentAt: new Date().toISOString(),
    }),
  );
  await rename(writingPath, path);
}
