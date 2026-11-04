import type { JSX } from "react";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Button } from "@/components/ui/button.tsx";
import type { ProjectId } from "@/ids.ts";
import type { SentProjectInvitation } from "@/projects/project-invitations.ts";
import { PROJECT_INVITE_COPY } from "@/ui/copy/project-invitations.ts";
import {
  inviteToProjectAction,
  revokeProjectInvitationAction,
} from "./actions.ts";

const HEADING_ID = "project-invite-heading";
const PENDING_HEADING_ID = "project-invite-pending-heading";

// The owner's invite form for her project, and its pending invitations,
// each with Revoke.
export function ProjectInvite({
  projectId,
  invitations,
}: {
  readonly projectId: ProjectId;
  readonly invitations: readonly SentProjectInvitation[];
}): JSX.Element {
  const copy = PROJECT_INVITE_COPY;
  return (
    <section aria-labelledby={HEADING_ID} className="panel flex flex-col gap-4">
      <h2 className="section-heading" id={HEADING_ID}>
        {copy.heading}
      </h2>
      <p className="text-muted">{copy.intro}</p>
      {/* Only strings cross to the client form: the copy also holds
          functions, which Server Components can't pass as props (#650). */}
      <LinkRequestForm
        action={inviteToProjectAction}
        clearOnSent={true}
        words={{
          emailLabel: copy.emailLabel,
          send: copy.send,
          sending: copy.sending,
        }}
      >
        <input name="projectId" type="hidden" value={projectId} />
      </LinkRequestForm>
      <h3 className="card-title" id={PENDING_HEADING_ID}>
        {copy.pendingHeading}
      </h3>
      {invitations.length === 0 && (
        <p className="text-muted">{copy.nonePending}</p>
      )}
      {invitations.length > 0 && (
        <ul
          aria-labelledby={PENDING_HEADING_ID}
          className="flex flex-col gap-3"
        >
          {invitations.map((invitation) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3"
              key={invitation.id}
            >
              <span className="flex min-w-0 flex-col">
                <span className="wrap-anywhere">{invitation.email}</span>
                <span className="text-muted text-sm">
                  <CopyWithTime
                    dateTime={invitation.invitedAt}
                    detail="day"
                    text={copy.invited(TIME_SLOT)}
                  />
                </span>
              </span>
              <form action={revokeProjectInvitationAction}>
                <input
                  name="invitationId"
                  type="hidden"
                  value={invitation.id}
                />
                <Button
                  aria-label={copy.revokeLabel(invitation.email)}
                  type="submit"
                  variant="secondary"
                >
                  {copy.revoke}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
