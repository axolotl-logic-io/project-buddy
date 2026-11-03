"use client";

import {
  type JSX,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import type { ProjectId, UserId } from "@/ids.ts";
import type { ProjectMember } from "@/projects/members-store.ts";
import { PROJECT_MEMBERS_COPY } from "@/ui/copy/projects.ts";
import { leaveProjectAction, removeMemberAction } from "./actions.ts";

// What a person is called in the list: the name they gave, or their email
// address when they have none, which everyone in the project may see.
function labelOf({ name, email }: ProjectMember): string {
  return name ?? email ?? "";
}

// A form with a button that opens a confirm dialog and, once the user
// confirms, submits the form.
function ConfirmedForm({
  action,
  fields,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onSubmit,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly fields: Readonly<Record<string, string>>;
  readonly trigger: JSX.Element;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onSubmit?: () => void;
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    onSubmit?.();
    formRef.current?.requestSubmit();
  }, [onSubmit]);
  return (
    <form action={action} ref={formRef}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <ConfirmDialog
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
        description={description}
        onConfirm={confirm}
        title={title}
        trigger={trigger}
      />
    </form>
  );
}

// One person's row: their name or address, their role and when they joined,
// and, for the owner looking at a member, the button that removes them.
function MemberRow({
  member,
  projectId,
  viewer,
  viewerOwns,
  onRemove,
}: {
  readonly member: ProjectMember;
  readonly projectId: ProjectId;
  readonly viewer: UserId;
  readonly viewerOwns: boolean;
  readonly onRemove: () => void;
}): JSX.Element {
  const label = labelOf(member);
  let shownLabel = label;
  if (member.id === viewer) {
    shownLabel = PROJECT_MEMBERS_COPY.you(label);
  }
  let role: string = PROJECT_MEMBERS_COPY.member;
  if (member.role === "owner") {
    role = PROJECT_MEMBERS_COPY.owner;
  }
  let removal: ReactNode = null;
  if (viewerOwns && member.role === "member") {
    removal = (
      <ConfirmedForm
        action={removeMemberAction}
        cancelLabel={PROJECT_MEMBERS_COPY.removeCancel}
        confirmLabel={PROJECT_MEMBERS_COPY.removeConfirm}
        description={PROJECT_MEMBERS_COPY.removeDescription(label)}
        fields={{ projectId, memberId: member.id }}
        onSubmit={onRemove}
        title={PROJECT_MEMBERS_COPY.removeTitle}
        trigger={
          <Button
            aria-label={PROJECT_MEMBERS_COPY.removeLabel(label)}
            variant="quiet"
          >
            {PROJECT_MEMBERS_COPY.remove}
          </Button>
        }
      />
    );
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col">
        <span className="break-words font-semibold">{shownLabel}</span>
        {member.name !== undefined && member.email !== undefined && (
          <span className="break-words text-muted text-sm">{member.email}</span>
        )}
        <span className="text-muted text-sm">
          <CopyWithTime
            dateTime={member.joinedAt}
            detail="day"
            text={PROJECT_MEMBERS_COPY.joined(role, TIME_SLOT)}
          />
        </span>
      </div>
      {removal}
    </li>
  );
}

// A project's Members section: its owner, then its members. The owner can
// remove a member, once they confirm; a member can leave the project, once
// they confirm, which takes them to their projects. When a removed member's
// row goes, keyboard focus moves to the section's heading.
export function ProjectMembers({
  projectId,
  members,
  viewer,
}: {
  readonly projectId: ProjectId;
  readonly members: readonly ProjectMember[];
  readonly viewer: UserId;
}): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const [removing, setRemoving] = useState<boolean>(false);
  const [shownMembers, setShownMembers] = useState(members);
  // How many removals have finished, each moving focus to the heading.
  const [removals, setRemovals] = useState(0);
  const onRemove = useCallback((): void => {
    setRemoving(true);
  }, []);
  if (members !== shownMembers) {
    setShownMembers(members);
    if (removing === true) {
      setRemoving(false);
      setRemovals(removals + 1);
    }
  }
  useEffect(() => {
    if (removals > 0) {
      headingRef.current?.focus();
    }
  }, [removals]);
  const viewerOwns = members.some(
    ({ id, role }) => id === viewer && role === "owner",
  );
  const viewerIsMember = members.some(
    ({ id, role }) => id === viewer && role === "member",
  );
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2
        className="section-heading"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
      >
        {PROJECT_MEMBERS_COPY.heading}
      </h2>
      <ul aria-labelledby={headingId} className="panel flex flex-col gap-3">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            onRemove={onRemove}
            projectId={projectId}
            viewer={viewer}
            viewerOwns={viewerOwns}
          />
        ))}
      </ul>
      {viewerOwns && members.length === 1 && (
        <p className="text-muted">{PROJECT_MEMBERS_COPY.alone}</p>
      )}
      {viewerIsMember && (
        <ConfirmedForm
          action={leaveProjectAction}
          cancelLabel={PROJECT_MEMBERS_COPY.leaveCancel}
          confirmLabel={PROJECT_MEMBERS_COPY.leaveConfirm}
          description={PROJECT_MEMBERS_COPY.leaveDescription}
          fields={{ projectId }}
          title={PROJECT_MEMBERS_COPY.leaveTitle}
          trigger={
            <Button className="self-start" variant="secondary">
              {PROJECT_MEMBERS_COPY.leave}
            </Button>
          }
        />
      )}
    </section>
  );
}
