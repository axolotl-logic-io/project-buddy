import type { Metadata } from "next";
import type { JSX } from "react";
import { sendInvitationAction } from "@/app/(workspace)/invitations/actions.ts";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import { requireAdmin } from "@/auth/require-admin.ts";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { INVITATIONS_COPY } from "@/ui/copy/invitations.ts";

export const metadata: Metadata = { title: INVITATIONS_COPY.title };

// The admin's invitation form, in the same frame as Account and Settings,
// at a form's width rather than the frame's.
export default async function InvitationsPage(): Promise<JSX.Element> {
  await requireAdmin();
  return (
    <PageWorkspace
      title={INVITATIONS_COPY.heading}
      intro={INVITATIONS_COPY.intro}
    >
      <div className="workspace-content border-line border-t">
        <div className="w-full max-w-md">
          <LinkRequestForm
            action={sendInvitationAction}
            words={INVITATIONS_COPY}
          />
        </div>
      </div>
    </PageWorkspace>
  );
}
