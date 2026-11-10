"use client";

import { Tabs } from "radix-ui";
import { type JSX, type ReactNode, useCallback, useRef, useState } from "react";
import { ProjectList } from "@/components/project-list.tsx";
import { QuestStatusFeedback } from "@/components/quest-status-controls.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { PREMADE_QUESTS } from "@/projects/premade-quests.ts";
import { QUEST_INDEX_TAB, type QuestIndexTab } from "@/projects/quest-index.ts";
import { QUEST_STATUSES } from "@/projects/quest-status.ts";
import type { Project } from "@/projects/store.ts";
import { PROJECTS_COPY, QUEST_LIBRARY_COPY } from "@/ui/copy/projects.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

function selectStatus(
  select: (status: QuestIndexTab) => void,
  value: string,
): void {
  const status = QUEST_INDEX_TAB.parse(value);
  select(status);
  const url = new URL(globalThis.location.href);
  url.searchParams.set("status", status);
  globalThis.history.replaceState(null, "", url);
}
function QuestStatusTabs({
  projects,
  initialStatus = "active",
  premade,
}: {
  readonly projects: Project[];
  readonly initialStatus?: QuestIndexTab;
  readonly premade?: ReactNode;
}): JSX.Element {
  let emptyMessage: string = QUEST_STATUS_COPY.empty;
  if (projects.length === 0) {
    emptyMessage = PROJECTS_COPY.none;
  }
  const [status, setStatus] = useState(initialStatus);
  const premadeRef = useRef<HTMLButtonElement>(null);
  const onFindStartingPoint = useCallback((): void => {
    selectStatus(setStatus, "premade");
    premadeRef.current?.focus();
  }, []);
  // The list's order says nothing while the selected tab lists no quests.
  let footer: string | undefined;
  if (status === "premade") {
    footer = PROJECTS_COPY.exploreFirst;
  } else if (projects.some((project) => project.status === status)) {
    footer = PROJECTS_COPY.newestFirst;
  }
  const onValueChange = selectStatus.bind(null, setStatus);
  return (
    <QuestStatusFeedback>
      <Tabs.Root
        value={status}
        onValueChange={onValueChange}
        className="quests-index-tabs"
      >
        <Tabs.List
          aria-label={QUEST_STATUS_COPY.tabs}
          className="quests-index-tablist"
        >
          {QUEST_STATUSES.map((choice) => (
            <Tabs.Trigger
              key={choice}
              value={choice}
              className="quest-workspace-tab"
            >
              {QUEST_STATUS_COPY.labels[choice]}
              <span aria-hidden="true" className="quests-index-count">
                {projects.filter((project) => project.status === choice).length}
              </span>
            </Tabs.Trigger>
          ))}
          {premade !== undefined && (
            <Tabs.Trigger
              value="premade"
              ref={premadeRef}
              className="quest-workspace-tab quests-index-premade"
            >
              <Icon name="book" />
              {QUEST_LIBRARY_COPY.heading}
              <span aria-hidden="true" className="quests-index-count">
                {PREMADE_QUESTS.length}
              </span>
            </Tabs.Trigger>
          )}
        </Tabs.List>
        {QUEST_STATUSES.map((choice) => (
          <Tabs.Content
            key={choice}
            value={choice}
            className="quests-index-content"
          >
            <ProjectList
              projects={projects.filter((project) => project.status === choice)}
              emptyMessage={emptyMessage}
            />
          </Tabs.Content>
        ))}
        {premade !== undefined && (
          <Tabs.Content value="premade" className="quests-index-content">
            {premade}
          </Tabs.Content>
        )}
        <footer className="quests-index-footer">
          {footer !== undefined && <p>{footer}</p>}
          {premade !== undefined && status !== "premade" && (
            <button
              className="button-quiet"
              type="button"
              onClick={onFindStartingPoint}
            >
              {PROJECTS_COPY.findStartingPoint}
              <Icon name="arrow-left" className="rotate-180" />
            </button>
          )}
        </footer>
      </Tabs.Root>
    </QuestStatusFeedback>
  );
}

export { QuestStatusTabs };
