import { pageTitle } from "@/ui/copy/site.ts";

export const INVITATIONS_COPY = {
  title: pageTitle("Invitations"),
  heading: "Invitations",
  intro:
    "Invite someone to set up their account. Existing accounts receive a normal sign-in link instead.",
  emailLabel: "Email address",
  send: "Send invitation",
  sending: "Sending…",
  needsEmail: "Enter a valid email address, such as name@example.com.",
  sent: "Invitation sent. If this address already has an account, we sent a sign-in link instead.",
  failed: "The invitation could not be sent. Please try again.",
} as const;

export const SETUP_COPY = {
  title: pageTitle("Set up your account"),
  intro: "Confirm to set up your account and sign in.",
  confirm: "Set up my account",
  unusable:
    "This invitation is no longer usable. It may have expired, been replaced, or already been used. Invitations last 30 minutes. Ask an admin for a new invitation if you do not have an account yet.",
  signIn: "Sign in to an existing account",
  loading: "Checking your invitation…",
} as const;

export const INVITATION_EMAIL_COPY = {
  subject: "Your invitation to Project Buddy",
  intro:
    "You have been invited to Project Buddy. Open this link to set up your account:",
  expiry:
    "This invitation is for your email address only. It can be used once, within 30 minutes. Opening the link alone does not create an account.",
} as const;
