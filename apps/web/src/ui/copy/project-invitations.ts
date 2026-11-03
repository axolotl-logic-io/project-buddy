// The text of project invitations: the invite form and pending list on a
// project's page, the invitations the invitee sees on the Projects page and
// the page an invitation's email opens, and the email itself.
import { EMAIL_SENDER_COPY, pageTitle, SITE_COPY } from "@/ui/copy/site.ts";

// What the project's owner sees on its page.
export const PROJECT_INVITE_COPY = {
  heading: "Invite someone",
  intro: `Invite someone with a ${SITE_COPY.name} account to work on this project with you. They join once they accept.`,
  emailLabel: "Their email address",
  send: "Send invitation",
  sending: "Sending…",
  needsEmail: "Enter a valid email address, such as name@example.com.",
  sent: (email: string): string =>
    `If ${email} has a ${SITE_COPY.name} account, we've sent them a project invitation.`,
  yourself: "That's your own address. You're already in this project.",
  alreadyMember: (email: string): string =>
    `${email} is already a member of this project.`,
  limited:
    "Invitation limit reached. Wait at least a minute before inviting this address again. You can send up to 20 project invitations an hour.",
  pendingHeading: "Pending invitations",
  nonePending: "No pending invitations.",
  invited: (invitedAt: string): string => `invited ${invitedAt}`,
  revoke: "Revoke",
  revokeLabel: (email: string): string => `Revoke the invitation to ${email}`,
} as const;

// What the invitee sees: on the Projects page and on the invitation's page.
export const PROJECT_INVITATION_COPY = {
  title: pageTitle("Project invitation"),
  listHeading: "Project invitations",
  question: (project: string): string => `Join ${project}?`,
  from: (inviter: string): string =>
    `${inviter} invited you to work on this project with them.`,
  shared:
    "Members share the project's chats, memory, notes and progress timeline.",
  join: "Join",
  joinLabel: (project: string): string => `Join ${project}`,
  decline: "Decline",
  declineLabel: (project: string): string =>
    `Decline the invitation to ${project}`,
} as const;

// The email is Hippy's, like every email the site sends.
export const PROJECT_INVITATION_EMAIL_COPY = {
  subject: (inviter: string, project: string): string =>
    `${inviter} invited you to "${project}" on ${SITE_COPY.name}`,
  greeting: "Hey there, friend.",
  intro: (inviter: string, project: string): string =>
    `${inviter} invited you to work with them on their project "${project}" in ${SITE_COPY.name}. Open the link to see the invitation and join:`,
  linkText: "See the invitation",
  expiry:
    "The link signs you in and works for 30 minutes. After that, sign in as usual: the invitation waits on your Projects page until you join or decline it.",
  notExpected:
    "Not feeling it? Decline, or just let this email float on by. Nothing changes until you choose to join.",
  signOff: "Peace,",
  signature: EMAIL_SENDER_COPY.name,
} as const;
