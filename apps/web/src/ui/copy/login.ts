// The text of the sign-in page, of the page a sign-in link opens, and of
// the email that holds the link.
import { EMAIL_SENDER_COPY, pageTitle, SITE_COPY } from "@/ui/copy/site.ts";

export const LOGIN_COPY = {
  title: pageTitle("Sign in"),
  intro:
    "Enter your email address, and we'll email you a link that signs you in.",
  emailLabel: "Email address",
  send: "Email me a sign-in link",
  sending: "Sending…",
  needsEmail: "Enter your email address, such as name@example.com.",
  checkEmail:
    "Check your email. If this address has an account, a sign-in link is on its way. It works for 30 minutes.",
  signUpPrompt: "Invited, and new here?",
  signUpLink: "Sign up",
} as const;

export const LINK_PAGE_COPY = {
  title: pageTitle("Continue signing in"),
  loading: "Checking your sign-in link…",
  intro: "Continue to sign in to Project Buddy in this browser.",
  continue: "Continue",
  expired:
    "This sign-in link has expired or no longer works. A link works for 30 minutes after it's sent.",
  newLink: "Ask for a new link",
} as const;

// The email is Hippy's (src/buddies/hippy.ts), for signing in and signing
// up alike, so it reads right to someone new and to someone coming back.
export const LOGIN_EMAIL_COPY = {
  subject: `Your sign-in link for ${SITE_COPY.name}, friend`,
  greeting: "Hey there, friend.",
  intro: `Whether this is your first trip or you're coming back, here's your link into ${SITE_COPY.name}. Open it whenever you're ready:`,
  linkText: `Sign in to ${SITE_COPY.name}`,
  expiry:
    "No rush: the link works for 30 minutes, on any device, as many times as you need.",
  notRequested:
    "If you didn't ask for this link, no worries. Just let this email float on by, and nothing changes.",
  signOff: "Peace,",
  signature: EMAIL_SENDER_COPY.name,
} as const;
