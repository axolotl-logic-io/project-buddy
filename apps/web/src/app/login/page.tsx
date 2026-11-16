import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { requestSignInLinkAction } from "@/app/login/actions.ts";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { localPath, SIGN_IN_DESTINATION_PARAMETER } from "@/routes.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";

export const metadata: Metadata = {
  title: LOGIN_COPY.title,
};

// The sign-in page, which every page shows to a signed-out visitor: their
// email address alone, for a sign-in link, and a link to the sign-up page.
// A page that sends them here to come back to, such as a timer link, names
// itself as the destination (SIGN_IN_DESTINATION_PARAMETER), and the
// emailed link leads there.
export default async function LoginPage({
  searchParams,
}: PageProps<"/login">): Promise<JSX.Element> {
  const { [SIGN_IN_DESTINATION_PARAMETER]: next } = await searchParams;
  const destination = localPath(next);
  return (
    <SignInPanel intro={LOGIN_COPY.intro}>
      <LinkRequestForm action={requestSignInLinkAction} words={LOGIN_COPY}>
        {destination !== undefined && (
          <input
            name={SIGN_IN_DESTINATION_PARAMETER}
            type="hidden"
            value={destination}
          />
        )}
      </LinkRequestForm>
      <p className="text-balance text-center text-muted">
        {LOGIN_COPY.signUpPrompt}{" "}
        <Link className="whitespace-nowrap text-link" href="/signup">
          {LOGIN_COPY.signUpLink}
        </Link>
      </p>
    </SignInPanel>
  );
}
