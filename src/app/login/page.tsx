import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requestLoginLinkAction } from "@/app/login/actions.ts";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { LOGIN_COPY } from "@/ui/copy/login.ts";

export const metadata: Metadata = {
  title: LOGIN_COPY.title,
};

// The sign-in page, which every page shows to a signed-out visitor: her
// email address alone, for a sign-in link, and a link to the sign-up page.
export default function LoginPage(): JSX.Element {
  return (
    <SignInPanel intro={LOGIN_COPY.intro}>
      <LinkRequestForm action={requestLoginLinkAction} words={LOGIN_COPY} />
      <p className="text-center text-muted">
        {LOGIN_COPY.signUpPrompt}{" "}
        <Link className="text-link" href="/signup">
          {LOGIN_COPY.signUpLink}
        </Link>
      </p>
    </SignInPanel>
  );
}
