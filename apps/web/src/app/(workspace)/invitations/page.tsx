import type { Metadata } from "next";
import type { JSX } from "react";
import { sendInvitationAction } from "@/app/(workspace)/invitations/actions.ts";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import { requireAdmin } from "@/auth/require-admin.ts";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";

export const metadata: Metadata = { title: INVITATIONS_COPY.title };

export default async function InvitationsPage(): Promise<JSX.Element> {
  await requireAdmin();
  return (
    <section className="panel flex flex-col gap-6">
      <h1 className="text-page-heading">{INVITATIONS_COPY.heading}</h1>
      <p>{INVITATIONS_COPY.intro}</p>
      <LinkRequestForm action={sendInvitationAction} words={INVITATIONS_COPY} />
    </section>
  );
}
