"use client";

import { Tabs } from "radix-ui";
import { type JSX, useState } from "react";
import { QuestList } from "@/components/quest-list.tsx";
import { QuestStatusFeedback } from "@/components/quest-status-controls.tsx";
import { POINTER_FOCUS_HANDLERS } from "@/components/tab-pointer-focus.ts";
import {
  QUEST_STATUS,
  QUEST_STATUSES,
  type QuestStatus,
} from "@/quests/quest-status.ts";
import type { Quest } from "@/quests/store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";

function selectStatus(
  select: (status: QuestStatus) => void,
  value: string,
): void {
  const status = QUEST_STATUS.parse(value);
  select(status);
  const url = new URL(globalThis.location.href);
  url.searchParams.set("status", status);
  globalThis.history.replaceState(null, "", url);
}
function QuestStatusTabs({
  quests,
  initialStatus = "active",
}: {
  readonly quests: Quest[];
  readonly initialStatus?: QuestStatus;
}): JSX.Element {
  let emptyMessage: string = QUEST_STATUS_COPY.empty;
  if (quests.length === 0) {
    emptyMessage = QUESTS_COPY.none;
  }
  const [status, setStatus] = useState(initialStatus);
  const onValueChange = selectStatus.bind(null, setStatus);
  return (
    <QuestStatusFeedback>
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
      </Tabs.Root>
    </QuestStatusFeedback>
  );
}

export { QuestStatusTabs };
