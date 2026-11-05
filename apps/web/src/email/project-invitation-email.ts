// The email that brings a project invitation, in Vellum's voice, as plain text
// and as simple HTML. It names the inviter and the project, which their users
// wrote and the site sends under its own name to whoever they invite, so the
// email shows each as a short, quoted label (emailLabel), never as a message
// of its own or a link, and the HTML escapes them.
import { type EmailMessage, escapeHtml } from "@/email/email-message.ts";
import { PROJECT_INVITATION_EMAIL_COPY } from "@/ui/copy/project-invitations.ts";

// The most characters of a name the email shows, before its ellipsis.
const EMAIL_LABEL_MAX_LENGTH = 60;
const ELLIPSIS = "…";
const WHITESPACE_RUN = /\s+/gu;
// What a mail program makes a link of: a host name such as
// "evil.example" or "www.evil.example", and a scheme's "://", anywhere in a
// word, as in markup's `href="https://evil.example"`.
const HOST_NAME = /[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/giu;
const SCHEME_SEPARATOR = /:\/\//gu;
const DOT = /\./gu;
// A whole email address, which a mail program links only to write to it.
const EMAIL_ADDRESS = /^[^\s@]+@[\w-]+(?:\.[\w-]+)+$/u;

// The word, with nothing in it a mail program would make a link of: host
// names' dots in brackets, as "evil[.]example", and "://" as "[:]//", the
// way security notices quote addresses. An email address stays as it is.
function unlinked(word: string): string {
  if (EMAIL_ADDRESS.test(word)) {
    return word;
  }
  return word
    .replaceAll(HOST_NAME, (host) => host.replaceAll(DOT, "[.]"))
    .replaceAll(SCHEME_SEPARATOR, "[:]//");
}

// The name as the email shows it: on one line, at most
// EMAIL_LABEL_MAX_LENGTH characters with an ellipsis after, and with
// nothing a mail program would make a link of.
function emailLabel(name: string): string {
  const line = name.replaceAll(WHITESPACE_RUN, " ").trim();
  const characters = Array.from(line);
  let short = line;
  if (characters.length > EMAIL_LABEL_MAX_LENGTH) {
    short = `${characters.slice(0, EMAIL_LABEL_MAX_LENGTH).join("").trimEnd()}${ELLIPSIS}`;
  }
  return short.split(" ").map(unlinked).join(" ");
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
  const from = emailLabel(inviter);
  const project = emailLabel(projectName);
  const introText = intro(from, project);
  return {
    to,
    subject: subject(from, project),
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
