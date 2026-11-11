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

// The email that brings the user a check-in: the construct's message, as the
// conversation shows it, a link to the quest and a link to turn the quest's
// check-ins off. One email per check-in, keyed by its message.
function checkInEmail({
  to,
  constructName,
  projectName,
  message,
  questUrl,
  offUrl,
  idempotencyKey,
}: {
  readonly to: string;
  readonly constructName: string;
  readonly projectName: string;
  readonly message: string;
  readonly questUrl: string;
  readonly offUrl: string;
  readonly idempotencyKey: string;
}): EmailMessage {
  const { subject, openQuest, turnOff } = CHECK_IN_EMAIL_COPY;
  return {
    to,
    subject: subject(constructName, projectName),
    text: [
      `${constructName}:`,
      message,
      `${openQuest}\n${questUrl}`,
      `${turnOff}\n${offUrl}`,
    ].join("\n\n"),
    html: [
      `<p><strong>${escapeHtml(constructName)}:</strong></p>`,
      ...message.split(PARAGRAPH_BREAK).map(htmlParagraph),
      htmlLink(openQuest, questUrl),
      htmlLink(turnOff, offUrl),
    ].join(""),
    idempotencyKey,
  };
}

export { checkInEmail };
