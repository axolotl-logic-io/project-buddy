"use client";

import { type JSX, useEffect, useRef, useState } from "react";
import { LinkRequestForm } from "@/app/login/link-request-form.tsx";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Notice } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import type { SentProjectInvitation } from "@/projects/project-invitations.ts";
import { PROJECT_INVITE_COPY } from "@/ui/copy/project-invitations.ts";
import { inviteToProjectAction } from "./actions.ts";
import { RevokeInvitationForm } from "./revoke-invitation-form.tsx";

const HEADING_ID = "project-invite-heading";
const PENDING_HEADING_ID = "project-invite-pending-heading";

// The owner's invite form and its pending invitations,
// each with Revoke.
export function ProjectInvite({
  projectId,
  invitations,
}: {
  readonly projectId: ProjectId;
  readonly invitations: readonly SentProjectInvitation[];
}): JSX.Element {
  const [revoked, setRevoked] = useState<string | undefined>(undefined);
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (revoked !== undefined) {
      resultRef.current?.focus();
    }
  }, [revoked]);
  const [previous, setPrevious] = useState(invitations);
  const [revision, setRevision] = useState(0);
  if (previous !== invitations) {
    setPrevious(invitations);
    if (
      previous.some(
        (old) => !invitations.some((current) => current.email === old.email),
      )
    ) {
      setRevision(revision + 1);
      const removed = previous.find(
        (old) => !invitations.some((current) => current.id === old.id),
      );
      setRevoked(removed?.email);
    }
  }
  const copy = PROJECT_INVITE_COPY;
  return (
    <section aria-labelledby={HEADING_ID} className="panel flex flex-col gap-4">
      <h2 className="section-heading" id={HEADING_ID} tabIndex={-1}>
        {copy.heading}
      </h2>
      <p className="text-muted">{copy.intro}</p>
      {revoked !== undefined && (
        <Notice ref={resultRef} role="status" tabIndex={-1}>
          {copy.revoked(revoked)}
        </Notice>
      )}
      {/* The button keeps its own width, like the workspace's other form
          buttons, rather than the sign-in form's full width. */}
      <div className="[&>form>button]:self-start">
        <LinkRequestForm
          key={revision}
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
      </div>
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
              <RevokeInvitationForm
                invitationId={invitation.id}
                email={invitation.email}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
