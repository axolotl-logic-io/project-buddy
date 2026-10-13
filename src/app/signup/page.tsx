import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { signUpAction } from "@/app/signup/actions.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

export const metadata: Metadata = {
  title: SIGNUP_COPY.title,
};

// The sign-up page: the invite code, which only invited people know,
// and an email address, for a sign-in link to a new account or the
// address's own; and a link to the sign-in page.
export default function SignUpPage(): JSX.Element {
  return (
    <SignInPanel intro={SIGNUP_COPY.intro}>
      <LinkRequestForm action={signUpAction} words={SIGNUP_COPY} />
      <p className="text-center text-muted">
        {SIGNUP_COPY.signInPrompt}{" "}
        <Link className="text-link" href="/login">
          {SIGNUP_COPY.signInLink}
        </Link>
      </p>
    </SignInPanel>
  );
}
