import type { JSX } from "react";
import {
  declineProjectInvitationAction,
  joinProjectAction,
} from "@/app/(workspace)/projects/invitations/actions.ts";
import { Button } from "@/components/ui/button.tsx";
import type { ProjectInvitation } from "@/projects/project-invitations.ts";
import { PROJECT_INVITATION_COPY } from "@/ui/copy/project-invitations.ts";

// Join and Decline for one pending project invitation, each named with the
// project, so a list of several reads apart.
export function ProjectInvitationAnswer({
  invitation,
}: {
  readonly invitation: ProjectInvitation;
}): JSX.Element {
  const { join, joinLabel, decline, declineLabel } = PROJECT_INVITATION_COPY;
  return (
    <div className="flex flex-wrap gap-3">
      <form action={joinProjectAction}>
        <input name="invitationId" type="hidden" value={invitation.id} />
        <Button aria-label={joinLabel(invitation.project.name)} type="submit">
          {join}
        </Button>
      </form>
      <form action={declineProjectInvitationAction}>
        <input name="invitationId" type="hidden" value={invitation.id} />
        <Button
          aria-label={declineLabel(invitation.project.name)}
          type="submit"
          variant="secondary"
        >
          {decline}
        </Button>
      </form>
    </div>
  );
}
