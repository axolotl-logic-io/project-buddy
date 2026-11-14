"use client";

import { type JSX, useActionState, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import type { QuestId, UserId } from "@/ids.ts";
import type { InviteState, RemoveFromQuest } from "@/quests/membership.ts";
import type { QuestPeople, QuestPerson } from "@/quests/membership-store.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";

type InviteAction = (
  state: InviteState,
  formData: FormData,
) => Promise<InviteState>;

const IDLE: InviteState = { kind: "idle" };

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

// What removing the person says once done.
function removedMessage(role: Role, name: string): string {
  if (role === "invited") {
    return QUEST_MEMBERS_COPY.withdrawn(name);
  }
  return QUEST_MEMBERS_COPY.removed(name);
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
          <Button disabled={busy} variant="secondary">
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
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
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

function InviteForm({
  questId,
  action,
}: {
  readonly questId: QuestId;
  readonly action: InviteAction;
}): JSX.Element {
  const [state, submit, pending] = useActionState(action, IDLE);
  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  let done: string | undefined;
  if (state.kind === "done") {
    done = state.message;
  }
  let label: string = QUEST_MEMBERS_COPY.invite;
  if (pending) {
    label = QUEST_MEMBERS_COPY.inviting;
  }
  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="questId" value={questId} />
      <TextField
        label={QUEST_MEMBERS_COPY.emailLabel}
        hint={QUEST_MEMBERS_COPY.emailHint}
        name="email"
        type="email"
        autoComplete="off"
        required={true}
        error={error}
      />
      <Button className="self-start" disabled={pending} type="submit">
        {label}
      </Button>
      <FormStatus>{done}</FormStatus>
      {state.kind === "problem" && <Alert>{state.message}</Alert>}
    </form>
  );
}

// A quest's Members tab: the owner, its members and pending invitations,
// then a form to invite someone by email. Anyone in the quest may remove a
// member or withdraw an invitation; a member may leave, which opens
// Quests. No one can remove the owner. A Dailies quest is its owner's
// alone and offers no invitations.
function QuestMembers({
  questId,
  viewer,
  people,
  dailies,
  invite,
  remove,
}: {
  readonly questId: QuestId;
  readonly viewer: UserId;
  readonly people: QuestPeople;
  readonly dailies: boolean;
  readonly invite: InviteAction;
  readonly remove: RemoveFromQuest;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const headingRef = useRef<HTMLParagraphElement>(null);
  const removePerson = useCallback(
    (person: QuestPerson, role: Role): void => {
      setBusy(true);
      setStatus(undefined);
      setFailure(undefined);
      remove({ questId, person: person.id })
        .then((result) => {
          if (result.kind === "failed") {
            setFailure(QUEST_MEMBERS_COPY.failed);
            return;
          }
          setStatus(removedMessage(role, person.displayName));
          headingRef.current?.focus();
        })
        .catch(() => setFailure(QUEST_MEMBERS_COPY.failed))
        .finally(() => setBusy(false));
    },
    [questId, remove],
  );
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
      <p className="text-muted">{QUEST_MEMBERS_COPY.intro}</p>
      <FormStatus>{status}</FormStatus>
      {failure !== undefined && <Alert>{failure}</Alert>}
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
      {dailies === true && <Notice>{QUEST_MEMBERS_COPY.dailies}</Notice>}
      {dailies !== true && <InviteForm action={invite} questId={questId} />}
    </section>
  );
}

export { QuestMembers };
