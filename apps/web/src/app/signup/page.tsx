import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requestSignInLinkAction } from "@/app/login/actions.ts";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

export const metadata: Metadata = {
  title: SIGNUP_COPY.title,
};

// Anyone can request email verification to create an account.
export default function SignUpPage(): JSX.Element {
  return (
    <SignInPanel intro={SIGNUP_COPY.intro}>
      <LinkRequestForm action={requestSignInLinkAction} words={LOGIN_COPY} />
      <p className="text-balance text-center text-muted">
        {SIGNUP_COPY.signInPrompt}{" "}
        <Link className="whitespace-nowrap text-link" href="/login">
          {SIGNUP_COPY.signInLink}
        </Link>
      </p>
    </SignInPanel>
  );
}
