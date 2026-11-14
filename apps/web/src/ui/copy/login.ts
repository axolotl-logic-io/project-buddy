// The text of the sign-in page, of the page a sign-in link opens, and of
// the email that holds the link.
import { EMAIL_SENDER_COPY, pageTitle, SITE_COPY } from "@/ui/copy/site.ts";

export const LOGIN_COPY = {
  title: pageTitle("Log in or sign up"),
  intro:
    "Enter your email address to log in or sign up. We'll email you a link to continue.",
  emailLabel: "Email address",
  send: "Email me a link",
  sending: "Sending…",
  needsEmail: "Enter your email address, such as name@example.com.",
  checkEmail:
    "Check your email for a link to log in or sign up. It works for 30 minutes.",
  signUpPrompt: "New here?",
  signUpLink: "Sign up",
} as const;

export const LINK_PAGE_COPY = {
  title: pageTitle("Continue signing in"),
  loading: "Checking your sign-in link…",
  intro:
    "Continue to verify your email and log in or create your Project Buddy account in this browser.",
  continue: "Continue",
  signupIntro: "Enter your name to finish creating your account.",
  nameInvalid: "Enter a name of 1–60 characters on one line, without { or }.",
  expired:
    "This sign-in link has expired or no longer works. A link works for 30 minutes after it's sent.",
  newLink: "Ask for a new link",
} as const;

// The email is Vellum's (EMAIL_SENDER_COPY), for signing in and signing
// up alike, so it reads right to someone new and to someone coming back.
export const LOGIN_EMAIL_COPY = {
  subject: `Your login or sign-up link for ${SITE_COPY.name}`,
  greeting: "Greetings, traveller.",
  intro: `Whether this is your first journey or you're returning to familiar ground, here is your way into ${SITE_COPY.name}. Open it whenever you're ready:`,
  linkText: `Continue to ${SITE_COPY.name}`,
  expiry:
    "The link works for 30 minutes, on any device. Continue to verify your email and log in or create your account.",
  notRequested:
    "If you didn't ask for this link, you can safely set this email aside. Nothing changes.",
  signOff: "Safe travels,",
  signature: EMAIL_SENDER_COPY.name,
} as const;
