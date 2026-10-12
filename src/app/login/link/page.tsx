import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { JSX } from "react";
import { readLoginLinkUser } from "@/accounts/login-links.ts";
import { continueSignInAction } from "@/app/login/link/actions.ts";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
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
// works, it asks her to continue, and continuing signs her in. For a link
// that has expired or no longer works, it says so, with a link to the
// sign-in page to ask for a new one.
export default async function LoginLinkPage({
  searchParams,
}: PageProps<"/login/link">): Promise<JSX.Element> {
  const { token: tokenParameter } = await searchParams;
  const token = singleToken(tokenParameter);
  // Waits for the request before reading the clock, which Next forbids in
  // a prerender, such as a prefetch's.
  await connection();
  const user = await readLoginLinkUser(token, new Date());
  if (user === undefined) {
    return (
      <SignInPanel intro={LINK_PAGE_COPY.expired}>
        <Button asChild={true}>
          <Link href="/login">{LINK_PAGE_COPY.newLink}</Link>
        </Button>
      </SignInPanel>
    );
  }
  return (
    <SignInPanel intro={LINK_PAGE_COPY.intro}>
      <form action={continueSignInAction} className="flex flex-col">
        <input name="token" type="hidden" value={token} />
        <Button type="submit">{LINK_PAGE_COPY.continue}</Button>
      </form>
    </SignInPanel>
  );
}
