import { type EmailMessage, escapeHtml } from "@/email/email-message.ts";
import { CHECK_IN_EMAIL_COPY } from "@/ui/copy/check-ins.ts";

// Blank lines, which split a message into paragraphs.
const PARAGRAPH_BREAK = /\n\s*\n/u;

// A paragraph's text as HTML, with its line breaks kept.
function htmlParagraph(text: string): string {
  return `<p>${escapeHtml(text).replaceAll("\n", "<br>")}</p>`;
}

// A link as an HTML paragraph, after its lead-in.
function htmlLink(leadIn: string, url: string): string {
  const escaped = escapeHtml(url);
  return `<p>${escapeHtml(leadIn)} <a href="${escaped}">${escaped}</a></p>`;
}

// The email that brings the user a check-in: the buddy's message, as the
// chat shows it, a link to the chat and a link to turn the project's
// check-ins off. One email per check-in chat, keyed by the chat.
function checkInEmail({
  to,
  buddyName,
  projectName,
  message,
  chatUrl,
  offUrl,
  idempotencyKey,
}: {
  readonly to: string;
  readonly buddyName: string;
  readonly projectName: string;
  readonly message: string;
  readonly chatUrl: string;
  readonly offUrl: string;
  readonly idempotencyKey: string;
}): EmailMessage {
  const { subject, openChat, turnOff } = CHECK_IN_EMAIL_COPY;
  return {
    to,
    subject: subject(buddyName, projectName),
    text: [
      `${buddyName}:`,
      message,
      `${openChat}\n${chatUrl}`,
      `${turnOff}\n${offUrl}`,
    ].join("\n\n"),
    html: [
      `<p><strong>${escapeHtml(buddyName)}:</strong></p>`,
      ...message.split(PARAGRAPH_BREAK).map(htmlParagraph),
      htmlLink(openChat, chatUrl),
      htmlLink(turnOff, offUrl),
    ].join(""),
    idempotencyKey,
  };
}

export { checkInEmail };
