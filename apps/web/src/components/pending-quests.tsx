"use client";

import Link from "next/link";
import { type JSX, type ReactNode, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import type { AnswerInvitation } from "@/quests/membership.ts";
import type { PendingQuest } from "@/quests/membership-store.ts";
import { PENDING_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

// What came of the last answer: who joined, with a link to the quest, or
// which invitation was declined.
type Answered =
  | { readonly kind: "accepted"; readonly quest: PendingQuest }
  | { readonly kind: "declined"; readonly quest: PendingQuest };

// One invitation as a notice: who invited the user to which quest, with
// Accept and Decline.
function PendingRow({
  quest,
  busy,
  onAnswer,
}: {
  readonly quest: PendingQuest;
  readonly busy: boolean;
  readonly onAnswer: (quest: PendingQuest, accept: boolean) => void;
}): JSX.Element {
  const accept = useCallback(
    (): void => onAnswer(quest, true),
    [onAnswer, quest],
  );
  const decline = useCallback(
    (): void => onAnswer(quest, false),
    [onAnswer, quest],
  );
  let invited: ReactNode = PENDING_COPY.invited;
  if (quest.invitedBy !== undefined) {
    invited = PENDING_COPY.invitedBy(quest.invitedBy);
  }
  return (
    <li className="quest-invitation">
      <span className="quests-label">{PENDING_COPY.notice}</span>
      <span className="quest-invitation-text">
        {invited} <strong>{quest.name}</strong>
      </span>
      <span className="quest-invitation-answer">
        <Button
          aria-label={PENDING_COPY.acceptLabel(quest.name)}
          aria-busy={busy}
          disabled={busy}
          onClick={accept}
        >
          {PENDING_COPY.accept}
        </Button>
        <Button
          aria-label={PENDING_COPY.declineLabel(quest.name)}
          aria-busy={busy}
          disabled={busy}
          onClick={decline}
          variant="secondary"
        >
          {PENDING_COPY.decline}
        </Button>
      </span>
    </li>
  );
}

// The quests the user is invited to and hasn't accepted, as notices at
// the top of Quests, each with Accept and Decline. Answering one leaves
// the others pending. Its notice goes with the answer, so focus moves to
// the list's hidden heading, and the status line says what happened, with
// a link to a joined quest. An invitation found to be gone, withdrawn or
// answered elsewhere, goes too.
function PendingQuests({
  quests,
  answer,
}: {
  readonly quests: readonly PendingQuest[];
  readonly answer: AnswerInvitation;
}): JSX.Element {
  const [settled, setSettled] = useState<ReadonlySet<QuestId>>(new Set());
  const shown = quests.filter(({ questId }) => !settled.has(questId));
  const [busy, setBusy] = useState(false);
  const [answered, setAnswered] = useState<Answered | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const headingRef = useRef<HTMLParagraphElement>(null);
  const onAnswer = useCallback(
    (quest: PendingQuest, accept: boolean): void => {
      setBusy(true);
      setAnswered(undefined);
      setFailure(undefined);
      answer({ questId: quest.questId, accept })
        .then((result) => {
          setSettled((before) => new Set(before).add(quest.questId));
          if (result.kind === "failed") {
            setFailure(PENDING_COPY.failed);
            return;
          }
          let kind: Answered["kind"] = "declined";
          if (accept) {
            kind = "accepted";
          }
          setAnswered({ kind, quest });
        })
        .catch(() => setFailure(PENDING_COPY.failed))
        .finally(() => {
          setBusy(false);
          // The answered row is gone, or its buttons were disabled.
          headingRef.current?.focus();
        });
    },
    [answer],
  );
  return (
    <div className="quest-invitations">
      <p className="sr-only" ref={headingRef} tabIndex={-1}>
        {PENDING_COPY.label}
      </p>
      <FormStatus>
        {answered?.kind === "accepted" && (
          <>
            {PENDING_COPY.accepted(
              answered.quest.name,
              QUEST_STATUS_COPY.labels[answered.quest.status],
            )}{" "}
            <Link
              className="text-link"
              href={`/quests/${answered.quest.questId}`}
            >
              {PENDING_COPY.open}
            </Link>
          </>
        )}
        {answered?.kind === "declined" &&
          PENDING_COPY.declined(answered.quest.name)}
      </FormStatus>
      {failure !== undefined && <Alert>{failure}</Alert>}
      {shown.length > 0 && (
        <ul aria-label={PENDING_COPY.label} className="flex flex-col gap-2">
          {shown.map((quest) => (
            <PendingRow
              busy={busy}
              key={quest.questId}
              onAnswer={onAnswer}
              quest={quest}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export { PendingQuests };
