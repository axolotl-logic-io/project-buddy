// The email that holds a sign-in link, as plain text and as simple HTML.
import type { EmailMessage } from "@/email/email-message.ts";
import { LOGIN_EMAIL_COPY } from "@/ui/copy/login.ts";

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const HTML_SPECIAL_CHARACTERS = /[&<>"']/gu;

function escapeHtml(text: string): string {
  return text.replaceAll(
    HTML_SPECIAL_CHARACTERS,
    (character) => HTML_ESCAPES[character] ?? character,
  );
}

// The email to `to` holding the link at url, sent once per idempotencyKey.
export function loginLinkEmail({
  to,
  url,
  idempotencyKey,
}: {
  readonly to: string;
  readonly url: string;
  readonly idempotencyKey: string;
}): EmailMessage {
  const { subject, intro, linkText, expiry } = LOGIN_EMAIL_COPY;
  return {
    to,
    subject,
    text: `${intro}\n\n${url}\n\n${expiry}\n`,
    html: [
      `<p>${escapeHtml(intro)}</p>`,
      `<p><a href="${escapeHtml(url)}">${escapeHtml(linkText)}</a></p>`,
      `<p>${escapeHtml(expiry)}</p>`,
    ].join("\n"),
    idempotencyKey,
  };
}
