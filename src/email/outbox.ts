// The end-to-end tests' email transport: each email becomes a JSON file in
// the outbox folder, which e2e/outbox.ts reads. One of the two files that
// may use Node's file system (biome.jsonc); only send-email.ts imports it.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EMAIL_SENDER, type EmailMessage } from "@/email/email-message.ts";

// What an idempotency key may keep in a file name.
const UNSAFE_FILE_NAME_CHARACTERS = /[^\w.-]/gu;

// Writes the message to `<directory>/<its idempotency key>.json`, as
// `{ from, to, subject, text, html, sentAt }`, sentAt in ISO 8601. A message sent again with the same
// key overwrites its file, so the outbox holds it once, as Resend sends it
// once.
export async function writeToOutbox(
  message: EmailMessage,
  directory: string,
): Promise<void> {
  const fileName = `${message.idempotencyKey.replaceAll(UNSAFE_FILE_NAME_CHARACTERS, "-")}.json`;
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, fileName),
    JSON.stringify({
      from: EMAIL_SENDER,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      sentAt: new Date().toISOString(),
    }),
  );
}
