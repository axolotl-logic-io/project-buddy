"use client";

import { Tabs } from "radix-ui";
import { type JSX, useState } from "react";
import { ProjectList } from "@/components/project-list.tsx";
import { QuestStatusFeedback } from "@/components/quest-status-controls.tsx";
import {
  QUEST_STATUS,
  QUEST_STATUSES,
  type QuestStatus,
} from "@/projects/quest-status.ts";
import type { Project } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

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
  projects,
  initialStatus = "active",
}: {
  readonly projects: Project[];
  readonly initialStatus?: QuestStatus;
}): JSX.Element {
  let emptyMessage: string = QUEST_STATUS_COPY.empty;
  if (projects.length === 0) {
    emptyMessage = PROJECTS_COPY.none;
  }
  const [status, setStatus] = useState(initialStatus);
  const onValueChange = selectStatus.bind(null, setStatus);
  return (
    <QuestStatusFeedback>
      <Tabs.Root
        value={status}
        onValueChange={onValueChange}
        className="flex flex-col gap-4"
      >
        <Tabs.List
          aria-label={QUEST_STATUS_COPY.tabs}
          className="flex flex-wrap gap-2"
        >
          {QUEST_STATUSES.map((choice) => (
            <Tabs.Trigger
              key={choice}
              value={choice}
              className="button-secondary data-[state=active]:bg-primary data-[state=active]:text-on-primary"
            >
              {QUEST_STATUS_COPY.labels[choice]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {QUEST_STATUSES.map((choice) => (
          <Tabs.Content key={choice} value={choice}>
            <ProjectList
              projects={projects.filter((project) => project.status === choice)}
              emptyMessage={emptyMessage}
            />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </QuestStatusFeedback>
  );
}

export { QuestStatusTabs };
