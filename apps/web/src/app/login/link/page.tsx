import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { JSX } from "react";
import { readSignInLinkUser } from "@/accounts/sign-in-links.ts";
import { readSignUpEmail } from "@/accounts/sign-up-links.ts";
import { ContinueForm } from "@/app/login/link/continue-form.tsx";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { currentUser } from "@/auth/current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { readInvitationLink } from "@/quests/membership-store.ts";
import { HOME_PATH, localPath, SIGN_IN_PATH } from "@/routes.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";
import { INVITATION_LINK_COPY } from "@/ui/copy/quest-members.ts";

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

// The page an emailed link opens: a sign-in link, a sign-up link or a quest
// invitation's acceptance link. Opening it signs no one in and accepts
// nothing, so a mail program that opens the link to check it gets nothing:
// for a link that works, it asks them to continue, with their name when
// continuing creates or completes their account. An acceptance link names
// the quest and who invited them, and warns when the browser is signed in
// to another account. For a link that has expired or no longer works,
// whatever kind it was, it says so, and where a pending invitation is
// found, with a way to log in, or to Quests when the browser is signed in.
// It says nothing of whose link it was.
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
  const now = new Date();
  const [invitation, user, signupEmail] = await Promise.all([
    readInvitationLink(token, now),
    readSignInLinkUser(token, now),
    readSignUpEmail(token, now),
  ]);
  if (invitation !== undefined) {
    const viewer = await currentUser();
    let intro = INVITATION_LINK_COPY.intro(
      invitation.invitedBy,
      invitation.questName,
    );
    if (invitation.needsName) {
      intro = `${intro} ${INVITATION_LINK_COPY.needsName}`;
    }
    return (
      <SignInPanel intro={intro}>
        {viewer !== undefined && viewer.id !== invitation.inviteeId && (
          <Notice>
            {INVITATION_LINK_COPY.otherAccount(invitation.inviteeEmail)}
          </Notice>
        )}
        <ContinueForm
          token={token}
          destination={undefined}
          signup={invitation.needsName}
        />
      </SignInPanel>
    );
  }
  if (user === undefined && signupEmail === undefined) {
    const viewer = await currentUser();
    return (
      <SignInPanel intro={LINK_PAGE_COPY.expired}>
        <p className="text-balance text-center">{LINK_PAGE_COPY.expiredNext}</p>
        {viewer === undefined && (
          <Button asChild={true}>
            <Link href={SIGN_IN_PATH}>{LINK_PAGE_COPY.logIn}</Link>
          </Button>
        )}
        {viewer !== undefined && (
          <Button asChild={true}>
            <Link href={HOME_PATH}>{LINK_PAGE_COPY.openQuests}</Link>
          </Button>
        )}
      </SignInPanel>
    );
  }
  let intro: string = LINK_PAGE_COPY.intro;
  const signup = user === undefined || user.needsName;
  if (signup) {
    intro = LINK_PAGE_COPY.signupIntro;
  }
  return (
    <SignInPanel intro={intro}>
      <ContinueForm token={token} destination={destination} signup={signup} />
    </SignInPanel>
  );
}
