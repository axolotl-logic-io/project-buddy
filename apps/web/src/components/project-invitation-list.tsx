import type { JSX } from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { ProjectInvitationAnswer } from "@/components/project-invitation-answer.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import type { ProjectInvitation } from "@/projects/project-invitations.ts";
import {
  PROJECT_INVITATION_COPY,
  PROJECT_INVITE_COPY,
} from "@/ui/copy/project-invitations.ts";

const HEADING_ID = "project-invitations-heading";

// The user's pending project invitations, each with who sent it, when, and
// Join and Decline; nothing at all when she has none.
export function ProjectInvitationList({
  invitations,
}: {
  readonly invitations: readonly ProjectInvitation[];
}): JSX.Element | null {
  if (invitations.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <h2 className="section-heading" id={HEADING_ID}>
        {PROJECT_INVITATION_COPY.listHeading}
      </h2>
      <ul className="flex flex-col gap-3">
        {invitations.map((invitation) => (
          <li className="panel flex flex-col gap-3" key={invitation.id}>
            <h3 className="card-title">
              {PROJECT_INVITATION_COPY.question(invitation.project.name)}
            </h3>
            <p>
              {PROJECT_INVITATION_COPY.from(invitation.inviter)}{" "}
              <span className="text-muted text-sm">
                <CopyWithTime
                  dateTime={invitation.invitedAt}
                  detail="day"
                  text={PROJECT_INVITE_COPY.invited(TIME_SLOT)}
                />
              </span>
            </p>
            <ProjectInvitationAnswer invitation={invitation} />
          </li>
        ))}
      </ul>
    </section>
  );
}
