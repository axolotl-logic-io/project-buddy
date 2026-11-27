"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type JSX, type SubmitEvent, useCallback, useId, useRef } from "react";
import { FolioDivider } from "@/components/folio-divider.tsx";
import { noteLeftQuest } from "@/components/left-quest.ts";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
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

// The first letter of a person's name, for their seal.
function initialOf(name: string): string {
  return Array.from(name.trim()).at(0)?.toLocaleUpperCase() ?? "";
}

// One person in the quest: a seal with their initial, their name over
// their role, and the control that takes them out, at the row's end.
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
    <li className="member-row" data-role={role}>
      <span aria-hidden={true} className="quest-seal member-seal">
        {initialOf(person.displayName)}
      </span>
      <span className="member-who">
        <span className="member-name">{name}</span>
        <span className="member-role">{ROLE_LABELS[role]}</span>
      </span>
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
  const hintId = useId();
  const errorId = useId();
  let label: string = QUEST_MEMBERS_COPY.invite;
  if (busy) {
    label = QUEST_MEMBERS_COPY.inviting;
  }
  let describedBy = hintId;
  if (problem !== undefined) {
    describedBy = `${hintId} ${errorId}`;
  }
  return (
    <form
      className="add-box"
      aria-label={QUEST_MEMBERS_COPY.inviteLabel}
      noValidate={true}
      onSubmit={submit}
    >
      <div className="add-box-row">
        <Icon name="people" />
        <input
          ref={emailRef}
          className="add-box-field"
          aria-label={QUEST_MEMBERS_COPY.emailLabel}
          aria-describedby={describedBy}
          aria-invalid={problem !== undefined}
          placeholder={QUEST_MEMBERS_COPY.emailLabel}
          name="email"
          type="email"
          autoComplete="off"
          required={true}
        />
        <Button aria-busy={busy} disabled={busy} type="submit">
          {label}
        </Button>
      </div>
      <p id={hintId} className="add-box-hint">
        {QUEST_MEMBERS_COPY.emailHint}
      </p>
      {problem !== undefined && <Alert id={errorId}>{problem}</Alert>}
      <FormStatus>{status}</FormStatus>
    </form>
  );
}

// A quest's Members page, in the page's frame like a list's page: a link
// back to the quest, the title with how many are in the quest, what
// members share, the invite box, then each person under an ornamented
// rule: the owner first, then members, then invitations not accepted yet.
function QuestMembers({
  viewer,
  people,
  quest,
  back,
}: {
  readonly viewer: UserId;
  readonly people: QuestPeople;
  readonly quest: {
    readonly id: QuestId;
    readonly name: string;
  };
  // The quest's overview, which the link back returns to.
  readonly back: Route;
}): JSX.Element {
  const { run, busy, status, problem } = useQuestAction(removeFromQuestAction);
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const peopleId = useId();
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
  const rows: PersonWithRole[] = [
    { person: people.owner, role: "owner" },
    ...people.members.map((person) => withRole(person, "member")),
    ...people.invited.map((person) => withRole(person, "invited")),
  ];
  return (
    <div className="page-workspace quest-folio">
      <header className="list-page-top">
        <Link
          className="list-page-back"
          href={back}
          aria-label={QUEST_MEMBERS_COPY.back(quest.name)}
        >
          <Icon name="chevron-left" />
          <span className="list-page-back-name">{quest.name}</span>
        </Link>
        <div className="list-page-name">
          <h2 ref={headingRef} tabIndex={-1} className="quest-focus-title">
            {QUEST_MEMBERS_COPY.heading}
          </h2>
          <span className="list-section-size">
            <span aria-hidden={true} className="list-section-dot" />{" "}
            {QUEST_MEMBERS_COPY.peopleCount(rows.length)}
          </span>
        </div>
        <p className="quest-overview-summary">{QUEST_MEMBERS_COPY.intro}</p>
      </header>
      <FormStatus>{status}</FormStatus>
      {problem !== undefined && <Alert>{problem}</Alert>}
      <InviteForm questId={quest.id} />
      <FolioDivider />
      <section aria-labelledby={peopleId} className="list-section">
        <div className="list-section-head">
          <h3 className="list-section-title" id={peopleId}>
            <span className="list-section-label">
              {QUEST_MEMBERS_COPY.people}
            </span>
          </h3>
          <span aria-hidden={true} className="list-section-rule" />
        </div>
        <ul aria-label={QUEST_MEMBERS_COPY.listLabel} className="member-rows">
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
      </section>
    </div>
  );
}

export { QuestMembers };
