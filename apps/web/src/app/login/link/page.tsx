import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { JSX } from "react";
import { readSignInLinkUser } from "@/accounts/sign-in-links.ts";
import { readSignUpEmail } from "@/accounts/sign-up-links.ts";
import { ContinueForm } from "@/app/login/link/continue-form.tsx";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { localPath } from "@/routes.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";

// The token a link gives once; a repeated or missing one reads as empty,
// which no link holds.
function singleToken(token: string | string[] | undefined): string {
  if (typeof token === "string") {
    return token;
  }
  return "";
}

export const metadata: Metadata = {
  title: LINK_PAGE_COPY.title,
};

// The page a sign-in link opens. Opening it signs no one in, so a mail
// program that opens the link to check it gets nothing: for a link that
// works, it asks her to continue, and continuing signs her in and opens the
// link's local destination, if it names one. For a link
// that has expired or no longer works, it says so, with a link to the
// sign-in page to ask for a new one.
export default async function SignInLinkPage({
  searchParams,
}: PageProps<"/login/link">): Promise<JSX.Element> {
  // next is SIGN_IN_DESTINATION_PARAMETER.
  const { token: tokenParameter, next } = await searchParams;
  const token = singleToken(tokenParameter);
  const destination = localPath(singleToken(next));
  // Waits for the request before reading the clock, which Next forbids in
  // a prerender, such as a prefetch's.
  await connection();
  const user = await readSignInLinkUser(token, new Date());
  const signupEmail = await readSignUpEmail(token, new Date());
  if (user === undefined && signupEmail === undefined) {
    return (
      <SignInPanel intro={LINK_PAGE_COPY.expired}>
        <Button asChild={true}>
          <Link href="/login">{LINK_PAGE_COPY.newLink}</Link>
        </Button>
      </SignInPanel>
    );
  }
  let intro: string = LINK_PAGE_COPY.intro;
  const signup = user === undefined;
  if (signup) {
    intro = LINK_PAGE_COPY.signupIntro;
  }
  return (
    <SignInPanel intro={intro}>
      <ContinueForm token={token} destination={destination} signup={signup} />
    </SignInPanel>
  );
}
