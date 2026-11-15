"use client";

import Link from "next/link";
import { type JSX, useCallback, useRef, useState } from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
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
  let invited = PENDING_COPY.invitedAt(TIME_SLOT);
  if (quest.invitedBy !== undefined) {
    invited = PENDING_COPY.invitedBy(quest.invitedBy, TIME_SLOT);
  }
  return (
    <li className="quests-index-row">
      <span className="quests-index-mark">
        <Icon name="compass" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="card-title wrap-anywhere">{quest.name}</span>
        <span className="text-muted text-sm">
          <CopyWithTime
            text={invited}
            dateTime={quest.invitedAt}
            detail="day"
          />
        </span>
      </div>
      <div className="quests-index-answer">
        <Button
          aria-label={PENDING_COPY.acceptLabel(quest.name)}
          disabled={busy}
          onClick={accept}
        >
          {PENDING_COPY.accept}
        </Button>
        <Button
          aria-label={PENDING_COPY.declineLabel(quest.name)}
          disabled={busy}
          onClick={decline}
          variant="secondary"
        >
          {PENDING_COPY.decline}
        </Button>
      </div>
    </li>
  );
}

// The quests the user is invited to and hasn't accepted, each with Accept
// and Decline. Answering one leaves the others pending. Its row goes with
// the answer, so focus moves to the list's heading, and the status line
// says what happened, with a link to a joined quest. An invitation found
// to be gone, withdrawn or answered elsewhere, goes too. onSettled names
// each invitation that is no longer pending, so the caller stops listing
// and counting it.
function PendingQuests({
  quests,
  answer,
  onSettled,
}: {
  readonly quests: readonly PendingQuest[];
  readonly answer: AnswerInvitation;
  readonly onSettled: (questId: QuestId) => void;
}): JSX.Element {
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
          onSettled(quest.questId);
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
    [answer, onSettled],
  );
  return (
    <div className="flex flex-col gap-3">
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
      {quests.length === 0 && <p className="text-muted">{PENDING_COPY.none}</p>}
      {quests.length > 0 && (
        <ul aria-label={PENDING_COPY.label} className="quests-index-list">
          {quests.map((quest) => (
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
