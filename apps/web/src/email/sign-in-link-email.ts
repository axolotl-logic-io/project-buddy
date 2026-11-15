// The email that holds a sign-in link, in Vellum's voice, as plain text and
// as simple HTML.
import type { EmailMessage } from "@/email/email-message.ts";
import { linkEmail } from "@/email/link-email.ts";
import { LOGIN_EMAIL_COPY } from "@/ui/copy/login.ts";

// The email to `to` holding the link at url, sent once per idempotencyKey.
export function signInLinkEmail({
  to,
  url,
  idempotencyKey,
}: {
  readonly to: string;
  readonly url: string;
  readonly idempotencyKey: string;
}): EmailMessage {
  const {
    subject,
    greeting,
    intro,
    linkText,
    expiry,
    notRequested,
    signOff,
    signature,
  } = LOGIN_EMAIL_COPY;
  return linkEmail({
    to,
    subject,
    before: [greeting, intro],
    url,
    linkText,
    after: [expiry, notRequested],
    signOff,
    signature,
    idempotencyKey,
  });
}
