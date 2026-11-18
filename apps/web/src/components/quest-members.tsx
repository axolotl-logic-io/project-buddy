"use client";

import { type JSX, type SubmitEvent, useCallback, useRef } from "react";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { usePanelSend } from "@/components/chat/chat-send.ts";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import type { UserId } from "@/ids.ts";
import type { QuestPeople, QuestPerson } from "@/quests/membership-store.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";

type Role = "owner" | "member" | "invited";

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  owner: QUEST_MEMBERS_COPY.owner,
  member: QUEST_MEMBERS_COPY.member,
  invited: QUEST_MEMBERS_COPY.invited,
};

interface PersonWithRole {
  readonly person: QuestPerson;
  readonly role: Role;
}

function withRole(person: QuestPerson, role: Role): PersonWithRole {
  return { person, role };
}

// The control that takes a person out of the quest: Leave for the viewer's
// own membership, Remove for another member, each confirmed first since it
// ends their access; Withdraw for a pending invitation. The owner has none.
function RemoveControl({
  person,
  role,
  viewer,
  busy,
  onRemove,
}: {
  readonly person: QuestPerson;
  readonly role: Role;
  readonly viewer: UserId;
  readonly busy: boolean;
  readonly onRemove: (person: QuestPerson, role: Role) => void;
}): JSX.Element | null {
  const remove = useCallback(
    (): void => onRemove(person, role),
    [onRemove, person, role],
  );
  if (role === "owner") {
    return null;
  }
  if (role === "invited") {
    return (
      <Button
        aria-label={QUEST_MEMBERS_COPY.withdrawLabel(person.displayName)}
        aria-busy={busy}
        disabled={busy}
        onClick={remove}
        variant="quiet"
      >
        {QUEST_MEMBERS_COPY.withdraw}
      </Button>
    );
  }
  if (person.id === viewer) {
    return (
      <ConfirmDialog
        trigger={
          <Button aria-busy={busy} disabled={busy} variant="secondary">
            {QUEST_MEMBERS_COPY.leave}
          </Button>
        }
        title={QUEST_MEMBERS_COPY.leave}
        description={QUEST_MEMBERS_COPY.leaveConfirm}
        confirmLabel={QUEST_MEMBERS_COPY.leaveConfirmButton}
        cancelLabel={QUEST_MEMBERS_COPY.leaveCancel}
        onConfirm={remove}
        focusHandledOnConfirm={true}
        variant="danger"
      />
    );
  }
  return (
    <ConfirmDialog
      trigger={
        <Button
          aria-label={QUEST_MEMBERS_COPY.removeLabel(person.displayName)}
          aria-busy={busy}
          disabled={busy}
          variant="quiet"
        >
          {QUEST_MEMBERS_COPY.remove}
        </Button>
      }
      title={QUEST_MEMBERS_COPY.removeLabel(person.displayName)}
      description={QUEST_MEMBERS_COPY.removeConfirm(person.displayName)}
      confirmLabel={QUEST_MEMBERS_COPY.remove}
      cancelLabel={QUEST_MEMBERS_COPY.removeCancel}
      onConfirm={remove}
      focusHandledOnConfirm={true}
      variant="danger"
    />
  );
}

function PersonRow({
  person,
  role,
  viewer,
  busy,
  onRemove,
}: {
  readonly person: QuestPerson;
  readonly role: Role;
  readonly viewer: UserId;
  readonly busy: boolean;
  readonly onRemove: (person: QuestPerson, role: Role) => void;
}): JSX.Element {
  let name = person.displayName;
  if (person.id === viewer) {
    name = QUEST_MEMBERS_COPY.you(name);
  }
  return (
    <li className="divided-row-action">
      <div className="flex min-w-0 flex-col">
        <span className="wrap-anywhere">{name}</span>
        <span className="text-muted text-sm">{ROLE_LABELS[role]}</span>
      </div>
      <RemoveControl
        busy={busy}
        onRemove={onRemove}
        person={person}
        role={role}
        viewer={viewer}
      />
    </li>
  );
}

// Sends /invite with the address the form holds. When no invitation went
// out, the address stays, so it can be corrected or sent again.
function InviteForm(): JSX.Element {
  const { send, busy, status, problem } = usePanelSend();
  const emailRef = useRef<HTMLInputElement>(null);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const form = event.currentTarget;
      const email = emailRef.current?.value.trim() ?? "";
      send(PANEL_COMMAND.invite(email))
        .then((result) => {
          if (result.sent) {
            form.reset();
          }
        })
        .catch(() => undefined)
        // The Invite button is disabled while the invitation goes out,
        // which would drop its focus, so each answer returns focus to the
        // address.
        .finally(() => emailRef.current?.focus());
    },
    [send],
  );
  let label: string = QUEST_MEMBERS_COPY.invite;
  if (busy) {
    label = QUEST_MEMBERS_COPY.inviting;
  }
  return (
    <form className="quest-member-invite" noValidate={true} onSubmit={submit}>
      <TextField
        ref={emailRef}
        label={QUEST_MEMBERS_COPY.emailLabel}
        hint={QUEST_MEMBERS_COPY.emailHint}
        name="email"
        type="email"
        autoComplete="off"
        required={true}
        error={problem}
      />
      <Button aria-busy={busy} disabled={busy} type="submit">
        {label}
      </Button>
      <FormStatus>{status}</FormStatus>
    </form>
  );
}

// The command that takes person out of the quest.
function removeCommand(
  person: QuestPerson,
  role: Role,
  viewer: UserId,
): string {
  if (role === "invited") {
    return PANEL_COMMAND.withdraw(person.displayName);
  }
  if (person.id === viewer) {
    return PANEL_COMMAND.leave;
  }
  return PANEL_COMMAND.remove(person.displayName);
}

// A quest's Members tab: the owner, its members and pending invitations,
// then a form to invite someone by email. Each control sends its command to
// the quest's conversation (src/commands/panel-commands.ts). Anyone in the
// quest may remove a member or withdraw an invitation; a member may leave,
// which opens Quests, where the quest they left is named. No one can remove
// the owner. A Dailies quest is its owner's alone, so its tab says only
// that.
function QuestMembers({
  viewer,
  people,
  dailies,
}: {
  readonly viewer: UserId;
  readonly people: QuestPeople;
  readonly dailies: boolean;
}): JSX.Element {
  const { send, busy, status, problem } = usePanelSend();
  const headingRef = useRef<HTMLParagraphElement>(null);
  const removePerson = useCallback(
    (person: QuestPerson, role: Role): void => {
      send(removeCommand(person, role, viewer))
        .catch(() => undefined)
        // The control that was used is gone or was disabled meanwhile.
        .finally(() => headingRef.current?.focus());
    },
    [send, viewer],
  );
  if (dailies) {
    return (
      <section className="page-slot flex flex-col gap-4">
        <Notice>{QUEST_MEMBERS_COPY.dailies}</Notice>
      </section>
    );
  }
  const rows: PersonWithRole[] = [
    { person: people.owner, role: "owner" },
    ...people.members.map((person) => withRole(person, "member")),
    ...people.invited.map((person) => withRole(person, "invited")),
  ];
  return (
    <section className="page-slot flex flex-col gap-4">
      <p className="sr-only" ref={headingRef} tabIndex={-1}>
        {QUEST_MEMBERS_COPY.heading}
      </p>
      <FormStatus>{status}</FormStatus>
      {problem !== undefined && <Alert>{problem}</Alert>}
      <InviteForm />
      <ul aria-label={QUEST_MEMBERS_COPY.listLabel} className="divided-rows">
        {rows.map(({ person, role }) => (
          <PersonRow
            busy={busy}
            key={`${role}-${person.id}`}
            onRemove={removePerson}
            person={person}
            role={role}
            viewer={viewer}
          />
        ))}
      </ul>
      <p className="text-muted">{QUEST_MEMBERS_COPY.intro}</p>
    </section>
  );
}

export { QuestMembers };
