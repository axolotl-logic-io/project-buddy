// The email that brings a project invitation, in Hippy's voice, as plain text
// and as simple HTML. It names the inviter and the project, which their users
// wrote, so the HTML escapes them, and the subject keeps them to one line.
import { type EmailMessage, escapeHtml } from "@/email/email-message.ts";
import { PROJECT_INVITATION_EMAIL_COPY } from "@/ui/copy/project-invitations.ts";

const WHITESPACE_RUN = /\s+/gu;

// The text on one line, as a subject needs it.
function oneLine(text: string): string {
  return text.replaceAll(WHITESPACE_RUN, " ").trim();
}

// The email to `to`, from inviter, about the project, whose link at url
// signs them in and opens the invitation. Sent once per idempotencyKey.
function projectInvitationEmail({
  to,
  inviter,
  projectName,
  url,
  idempotencyKey,
}: {
  readonly to: string;
  readonly inviter: string;
  readonly projectName: string;
  readonly url: string;
  readonly idempotencyKey: string;
}): EmailMessage {
  const {
    subject,
    greeting,
    intro,
    linkText,
    expiry,
    notExpected,
    signOff,
    signature,
  } = PROJECT_INVITATION_EMAIL_COPY;
  const introText = intro(inviter, projectName);
  return {
    to,
    subject: oneLine(subject(inviter, projectName)),
    text: [
      greeting,
      introText,
      url,
      expiry,
      notExpected,
      `${signOff}\n${signature}\n`,
    ].join("\n\n"),
    html: [
      `<p>${escapeHtml(greeting)}</p>`,
      `<p>${escapeHtml(introText)}</p>`,
      `<p><a href="${escapeHtml(url)}">${escapeHtml(linkText)}</a></p>`,
      `<p>${escapeHtml(expiry)}</p>`,
      `<p>${escapeHtml(notExpected)}</p>`,
      `<p>${escapeHtml(signOff)}<br>${escapeHtml(signature)}</p>`,
    ].join("\n"),
    idempotencyKey,
  };
}

export { projectInvitationEmail };
