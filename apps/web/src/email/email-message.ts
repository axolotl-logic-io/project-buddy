// An email the site sends, as every transport takes it (send-email.ts).
import { readEmailFromAddress } from "@/env.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

// The sender of every email: EMAIL_FROM_ADDRESS, under the site's name. It
// is read on each send, never at import.
function emailSender(): string {
  return `${SITE_COPY.name} <${readEmailFromAddress()}>`;
}

interface EmailMessage {
  // One recipient's address.
  readonly to: string;
  readonly subject: string;
  // The body as plain text, and as simple HTML for mail programs that show
  // it instead.
  readonly text: string;
  readonly html: string;
  // Names this email among every email the site sends: a transport sends a
  // message once per key, so sending it again, such as when a request is
  // retried, sends nothing more. It holds no address and is never logged.
  readonly idempotencyKey: string;
}

export type { EmailMessage };
export { emailSender };
