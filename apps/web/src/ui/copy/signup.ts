// The text of the sign-up page.
import { pageTitle } from "@/ui/copy/site.ts";

export const SIGNUP_COPY = {
  title: pageTitle("Sign up"),
  intro:
    "Invited? Enter your invite code and your email address, and we'll email you a link that signs you in.",
  inviteCodeLabel: "Invite code",
  emailLabel: "Email address",
  send: "Sign up",
  sending: "Sending…",
  needsEmail: "Enter your email address, such as name@example.com.",
  wrongInviteCode: "Wrong invite code. Check it and try again.",
  lockedOut:
    "Too many failed attempts from here. Wait 15 minutes, then try again.",
  checkEmail:
    "Check your email. A sign-in link is on its way to this address. It works for 30 minutes.",
  signInPrompt: "Already have an account?",
  signInLink: "Sign in",
} as const;
