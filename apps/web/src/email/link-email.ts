// An email built around one link, in Vellum's voice, as plain text and as
// simple HTML: paragraphs before the link, the link, paragraphs after it,
// and a sign-off. Every text is escaped for the HTML.
import type { EmailMessage } from "@/email/email-message.ts";

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

interface LinkEmail {
  readonly to: string;
  readonly subject: string;
  readonly before: readonly string[];
  readonly url: string;
  // What the HTML's link says; the plain text shows the address itself.
  readonly linkText: string;
  readonly after: readonly string[];
  readonly signOff: string;
  readonly signature: string;
  readonly idempotencyKey: string;
}

function linkEmail(email: LinkEmail): EmailMessage {
  const { before, after, url, linkText, signOff, signature } = email;
  return {
    to: email.to,
    subject: email.subject,
    text: [...before, url, ...after, `${signOff}\n${signature}\n`].join("\n\n"),
    html: [
      ...before.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
      `<p><a href="${escapeHtml(url)}">${escapeHtml(linkText)}</a></p>`,
      ...after.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
      `<p>${escapeHtml(signOff)}<br>${escapeHtml(signature)}</p>`,
    ].join("\n"),
    idempotencyKey: email.idempotencyKey,
  };
}

export { linkEmail };
