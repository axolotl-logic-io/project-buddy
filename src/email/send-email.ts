// The site's one way to send an email. EMAIL_TRANSPORT chooses how: through
// Resend, as production does, or into the end-to-end tests' file outbox.
import type { EmailMessage } from "@/email/email-message.ts";
import { writeToOutbox } from "@/email/outbox.ts";
import { sendWithResend } from "@/email/resend.ts";
import {
  readEmailOutboxDir,
  readEmailTransport,
  readResendApiKey,
} from "@/env.ts";

// Sends the message, once per idempotency key. fetchFn is the fetch that
// reaches Resend, which unit tests replace. Throws an EmailFailure, with
// its problem, when Resend doesn't take the email.
export async function sendEmail(
  message: EmailMessage,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  if (readEmailTransport() === "outbox") {
    await writeToOutbox(message, readEmailOutboxDir());
    return;
  }
  await sendWithResend(message, readResendApiKey(), fetchFn);
}
