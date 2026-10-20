import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

export const metadata: Metadata = {
  title: SIGNUP_COPY.title,
};

// The former sign-up URL explains admin invitations and offers normal sign-in.
export default function SignUpPage(): JSX.Element {
  return (
    <SignInPanel intro={SIGNUP_COPY.intro}>
      <p className="text-center text-muted">
        {SIGNUP_COPY.signInPrompt}{" "}
        <Link className="text-link" href="/login">
          {SIGNUP_COPY.signInLink}
        </Link>
      </p>
    </SignInPanel>
  );
}
