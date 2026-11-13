import { pageTitle } from "./site.ts";

export const SIGNUP_COPY = {
  title: pageTitle("Sign up"),
  intro:
    "Create your account with an emailed link. Enter your email address to get started.",
  signInPrompt: "Already have an account?",
  signInLink: "Log in",
} as const;
