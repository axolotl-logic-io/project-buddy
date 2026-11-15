"use client";

import { useRouter } from "next/navigation";
import {
  type JSX,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { noteLeftQuest } from "@/components/left-quest.ts";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import type { QuestId, UserId } from "@/ids.ts";
import type { InviteState, RemoveFromQuest } from "@/quests/membership.ts";
import type { QuestPeople, QuestPerson } from "@/quests/membership-store.ts";
import { HOME_PATH } from "@/routes.ts";
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

// The address the form shows: the one just submitted when no invitation
// went out, so it can be corrected or sent again; otherwise none.
function keptEmail(state: InviteState): string {
  if (state.kind === "idle" || state.kind === "done") {
    return "";
  }
  return state.email;
}

function InviteForm({
  questId,
  action,
}: {
  readonly questId: QuestId;
  readonly action: InviteAction;
}): JSX.Element {
  const [state, submit, pending] = useActionState(action, IDLE);
  const emailRef = useRef<HTMLInputElement>(null);
  // The Invite button is disabled while the invitation goes out, which
  // would drop its focus, so each answer returns focus to the address.
  useEffect(() => {
    if (state.kind !== "idle") {
      emailRef.current?.focus();
    }
  }, [state]);
  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  let done: string | undefined;
  if (state.kind === "done" || state.kind === "refused") {
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
        ref={emailRef}
        label={QUEST_MEMBERS_COPY.emailLabel}
        hint={QUEST_MEMBERS_COPY.emailHint}
        name="email"
        type="email"
        autoComplete="off"
        required={true}
        defaultValue={keptEmail(state)}
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
// Quests, where the quest they left is named. No one can remove the owner.
// A Dailies quest is its owner's alone, so its tab says only that.
function QuestMembers({
  questId,
  questName,
  viewer,
  people,
  dailies,
  invite,
  remove,
}: {
  readonly questId: QuestId;
  readonly questName: string;
  readonly viewer: UserId;
  readonly people: QuestPeople;
  readonly dailies: boolean;
  readonly invite: InviteAction;
  readonly remove: RemoveFromQuest;
}): JSX.Element {
  const router = useRouter();
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
          if (person.id === viewer) {
            noteLeftQuest(questName);
            router.replace(HOME_PATH);
            return;
          }
          setStatus(removedMessage(role, person.displayName));
        })
        .catch(() => setFailure(QUEST_MEMBERS_COPY.failed))
        .finally(() => {
          setBusy(false);
          // The control that was used is gone or was disabled meanwhile.
          headingRef.current?.focus();
        });
    },
    [questId, questName, remove, router, viewer],
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
      <InviteForm action={invite} questId={questId} />
    </section>
  );
}

export { QuestMembers };
