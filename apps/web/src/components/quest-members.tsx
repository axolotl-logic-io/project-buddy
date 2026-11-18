"use client";

import { useRouter } from "next/navigation";
import { type JSX, type SubmitEvent, useCallback, useRef } from "react";
import { noteLeftQuest } from "@/components/left-quest.ts";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId, UserId } from "@/ids.ts";
import {
  inviteToQuestAction,
  removeFromQuestAction,
} from "@/quests/membership-actions.ts";
import type { QuestPeople, QuestPerson } from "@/quests/membership-store.ts";
import { HOME_PATH } from "@/routes.ts";
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

function InviteForm({ questId }: { readonly questId: QuestId }): JSX.Element {
  const { run, busy, status, problem } = useQuestAction(inviteToQuestAction);
  const emailRef = useRef<HTMLInputElement>(null);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const form = event.currentTarget;
      const email = emailRef.current?.value.trim() ?? "";
      run({ questId, email })
        .then((saved) => {
          if (saved) {
            form.reset();
          }
        })
        .catch(() => undefined)
        // The Invite button is disabled while the invitation goes out,
        // which would drop its focus, so each answer returns focus to the
        // address.
        .finally(() => emailRef.current?.focus());
    },
    [questId, run],
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

function QuestMembers({
  viewer,
  people,
  quest,
}: {
  readonly viewer: UserId;
  readonly people: QuestPeople;
  readonly quest: {
    readonly id: QuestId;
    readonly name: string;
    readonly dailies: boolean;
  };
}): JSX.Element {
  const { run, busy, status, problem } = useQuestAction(removeFromQuestAction);
  const router = useRouter();
  const headingRef = useRef<HTMLParagraphElement>(null);
  const removePerson = useCallback(
    (person: QuestPerson): void => {
      run({ questId: quest.id, person: person.id })
        .then((saved) => {
          if (saved && person.id === viewer) {
            noteLeftQuest(quest.name);
            router.replace(HOME_PATH);
          }
        })
        .catch(() => undefined)
        // The control that was used is gone or was disabled meanwhile.
        .finally(() => headingRef.current?.focus());
    },
    [quest.id, quest.name, router, run, viewer],
  );
  if (quest.dailies) {
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
      <InviteForm questId={quest.id} />
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
