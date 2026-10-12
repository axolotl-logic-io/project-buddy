// The text of the login page.
import { pageTitle } from "@/ui/copy/site.ts";

export const LOGIN_COPY = {
  title: pageTitle("Log in"),
  intro: "Enter the passphrase to start learning.",
  passphrase: "Passphrase",
  unlock: "Unlock",
  lockedOut: "Too many failed attempts. Try again later.",
  wrongPassphrase: "Wrong passphrase.",
} as const;
