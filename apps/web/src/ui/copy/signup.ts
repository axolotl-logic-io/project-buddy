// The text of the sign-up page.
import { pageTitle } from "./site.ts";

export const SIGNUP_COPY = {
  title: pageTitle("Sign up"),
  intro:
    "New accounts require an invitation from an admin. Open the setup link in your invitation email, or ask an admin to invite your email address.",
  signInPrompt: "Already have an account?",
  signInLink: "Sign in",
} as const;
