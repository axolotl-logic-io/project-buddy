import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { SignOutButtons } from "./sign-out-buttons.tsx";

const SIGN_OUT_HEADING_ID = "sign-out-heading";

// The account page's shell: its heading, the usage the page streams in, and
// the sign-out buttons, which show whether or not the usage meter does.
export default function AccountLayout({
  children,
}: LayoutProps<"/account">): JSX.Element {
  return (
    <>
      <BackLink href={HOME_PATH}>{ACCOUNT_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{ACCOUNT_COPY.heading}</h1>
      {children}
      <section
        aria-labelledby={SIGN_OUT_HEADING_ID}
        className="panel flex flex-col gap-4"
      >
        <h2 className="section-heading" id={SIGN_OUT_HEADING_ID}>
          {ACCOUNT_COPY.signOutHeading}
        </h2>
        <SignOutButtons />
      </section>
    </>
  );
}
