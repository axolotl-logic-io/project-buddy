import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { JSX } from "react";
import { readInvitation } from "@/accounts/invitations.ts";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { confirmSetupAction } from "@/app/setup/actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { SETUP_COPY } from "@/ui/copy/invitations.ts";

// The token a link gives once; a repeated or missing one reads as empty,
// which no link holds.
function singleToken(token: string | string[] | undefined): string {
  if (typeof token === "string") {
    return token;
  }
  return "";
}

export const metadata: Metadata = {
  title: SETUP_COPY.title,
};

// Opening an invitation is read-only. Only confirmation can consume it and
// create its account. An unusable link offers normal sign-in for an account
// already created, or explains how to get another invitation.
export default async function SetupPage({
  searchParams,
}: PageProps<"/setup">): Promise<JSX.Element> {
  const { token: tokenParameter } = await searchParams;
  const token = singleToken(tokenParameter);
  // Waits for the request before reading the clock, which Next forbids in
  // a prerender, such as a prefetch's.
  await connection();
  const email = await readInvitation(token, new Date());
  if (email === undefined) {
    return (
      <SignInPanel intro={SETUP_COPY.unusable}>
        <Button asChild={true}>
          <Link href="/login">{SETUP_COPY.signIn}</Link>
        </Button>
      </SignInPanel>
    );
  }
  return (
    <SignInPanel intro={SETUP_COPY.intro}>
      <form action={confirmSetupAction} className="flex flex-col">
        <p className="mb-4 break-words">{email}</p>
        <input name="token" type="hidden" value={token} />
        <Button type="submit">{SETUP_COPY.confirm}</Button>
      </form>
    </SignInPanel>
  );
}
