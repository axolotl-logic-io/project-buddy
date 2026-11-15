"use client";

import { Tabs } from "radix-ui";
import { type JSX, useCallback, useContext, useEffect, useState } from "react";
import { takeLeftQuest } from "@/components/left-quest.ts";
import { PendingQuests } from "@/components/pending-quests.tsx";
import { QuestList } from "@/components/quest-list.tsx";
import { QuestStatusFeedback } from "@/components/quest-status-controls.tsx";
import { StatusFeedbackContext } from "@/components/quest-status-feedback-context.ts";
import { parseQuestTab, type QuestTab } from "@/components/quest-tab.ts";
import { POINTER_FOCUS_HANDLERS } from "@/components/tab-pointer-focus.ts";
import type { QuestId } from "@/ids.ts";
import type { AnswerInvitation } from "@/quests/membership.ts";
import type { PendingQuest } from "@/quests/membership-store.ts";
import { QUEST_STATUSES } from "@/quests/quest-status.ts";
import type { Quest } from "@/quests/store.ts";
import { PENDING_COPY, QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";

function selectStatus(select: (status: QuestTab) => void, value: string): void {
  const status = parseQuestTab(value);
  if (status === undefined) {
    return;
  }
  select(status);
  const url = new URL(globalThis.location.href);
  url.searchParams.set("status", status);
  globalThis.history.replaceState(null, "", url);
}
// Names, once, the quest the user just left, in the status line Quests
// keeps for its feedback, which takes focus.
function LeftQuestStatus(): null {
  const publish = useContext(StatusFeedbackContext);
  useEffect(() => {
    const name = takeLeftQuest();
    if (name !== undefined) {
      publish?.({ kind: "saved", message: QUEST_MEMBERS_COPY.left(name) });
    }
  }, [publish]);
  return null;
}

// The user's quests by status, each status a tab. Given pending
// invitations, a Pending tab lists them last, with Accept and Decline, and
// its name says how many there are. An invitation answered here, or found
// gone, leaves the list and the count at once. After the user leaves a
// quest, the status line names it.
function QuestStatusTabs({
  quests,
  initialStatus = "active",
  pending,
}: {
  readonly quests: Quest[];
  readonly initialStatus?: QuestTab;
  readonly pending?:
    | {
        readonly quests: readonly PendingQuest[];
        readonly answer: AnswerInvitation;
      }
    | undefined;
}): JSX.Element {
  let emptyMessage: string = QUEST_STATUS_COPY.empty;
  if (quests.length === 0) {
    emptyMessage = QUESTS_COPY.none;
  }
  const [status, setStatus] = useState<QuestTab>(initialStatus);
  const [settled, setSettled] = useState<ReadonlySet<QuestId>>(new Set());
  const settle = useCallback((questId: QuestId): void => {
    setSettled((before) => new Set(before).add(questId));
  }, []);
  const stillPending = (pending?.quests ?? []).filter(
    (quest) => !settled.has(quest.questId),
  );
  const onValueChange = selectStatus.bind(null, setStatus);
  return (
    <QuestStatusFeedback>
      <LeftQuestStatus />
      <Tabs.Root value={status} onValueChange={onValueChange}>
        <div className="border-line border-b">
          <Tabs.List
            aria-label={QUEST_STATUS_COPY.tabs}
            className="workspace-tablist"
          >
            {QUEST_STATUSES.map((choice) => (
              <Tabs.Trigger
                key={choice}
                value={choice}
                className="workspace-tab"
                {...POINTER_FOCUS_HANDLERS}
              >
                {QUEST_STATUS_COPY.labels[choice]}
                <span aria-hidden="true" className="quests-index-count">
                  {quests.filter((quest) => quest.status === choice).length}
                </span>
              </Tabs.Trigger>
            ))}
            {pending !== undefined && (
              <Tabs.Trigger
                value="pending"
                aria-label={PENDING_COPY.tabLabel(stillPending.length)}
                className="workspace-tab"
                {...POINTER_FOCUS_HANDLERS}
              >
                {PENDING_COPY.label}
                <span aria-hidden="true" className="quests-index-count">
                  {stillPending.length}
                </span>
              </Tabs.Trigger>
            )}
          </Tabs.List>
        </div>
        {QUEST_STATUSES.map((choice) => (
          <Tabs.Content
            key={choice}
            value={choice}
            className="quests-index-content"
          >
            <QuestList
              quests={quests.filter((quest) => quest.status === choice)}
              emptyMessage={emptyMessage}
            />
          </Tabs.Content>
        ))}
        {pending !== undefined && (
          <Tabs.Content value="pending" className="quests-index-content">
            <PendingQuests
              quests={stillPending}
              answer={pending.answer}
              onSettled={settle}
            />
          </Tabs.Content>
        )}
      </Tabs.Root>
    </QuestStatusFeedback>
  );
}

export { QuestStatusTabs };
