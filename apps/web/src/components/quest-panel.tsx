"use client";

import type { JSX } from "react";
import {
  PanelCollections,
  PanelUtilities,
} from "@/components/panel-collections.tsx";
import { useTaskSection } from "@/components/task-section.tsx";
import { useTasks } from "@/components/tasks/use-tasks.ts";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import { nextTask } from "@/tasks/tasks.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

const NO_SECTIONS: readonly WorkspaceSection[] = [];

// Ongoing work starts with the live next task, independent of the collection
// being read. Reordering or completing Tasks updates this context at once.
function QuestPanel({
  sections = NO_SECTIONS,
  initialSection,
}: {
  readonly sections?: readonly WorkspaceSection[] | undefined;
  readonly initialSection?: string | undefined;
}): JSX.Element {
  const tasks = useTasks();
  const taskSections = useTaskSection();
  let next: string = QUEST_SIDEBAR_COPY.noNextTask;
  if (tasks !== undefined) {
    next = nextTask(tasks.state.tasks)?.text ?? next;
  }
  return (
    <>
      <section
        className="quest-next-task"
        aria-label={QUEST_SIDEBAR_COPY.nextTask}
      >
        <h3 className="text-muted text-sm">{QUEST_SIDEBAR_COPY.nextTask}</h3>
        <p className="wrap-anywhere font-heading text-lg">{next}</p>
      </section>
      <PanelCollections
        sections={[
          ...taskSections,
          ...sections.filter((section) => section.bucket === true),
        ]}
        initialSection={initialSection}
      />
      <PanelUtilities sections={sections} initialSection={initialSection} />
    </>
  );
}

export { QuestPanel };
