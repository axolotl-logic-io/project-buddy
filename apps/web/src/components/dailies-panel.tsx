"use client";

import type { JSX } from "react";
import { DayGrid } from "@/components/dailies/day-grid.tsx";
import { PanelCollections } from "@/components/panel-collections.tsx";
import { StartDay } from "@/components/start-day.tsx";
import { useTaskSection } from "@/components/task-section.tsx";
import type { WorkspaceSection } from "@/components/workspace-section.ts";
import type { DailiesRecord } from "@/dailies/dailies.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

// Daily work brings the manual day boundary forward and separates recurring
// history from recorded milestones. Only an Active Dailies has a day record.
function DailiesPanel({
  sections,
  record,
  initialSection,
}: {
  readonly sections: readonly WorkspaceSection[];
  readonly record: DailiesRecord | undefined;
  readonly initialSection?: string | undefined;
}): JSX.Element {
  const tasks = useTaskSection();
  return (
    <>
      <section
        className="dailies-day-controls"
        aria-label={QUEST_SIDEBAR_COPY.day}
      >
        <h3 className="font-heading text-lg">{QUEST_SIDEBAR_COPY.day}</h3>
        {record !== undefined && (
          <StartDay
            lastStartedAt={record.days.at(-1)?.startedAt}
            undoable={record.undoable}
          />
        )}
        {record === undefined && (
          <p className="text-muted text-sm">{QUEST_SIDEBAR_COPY.restoreDay}</p>
        )}
      </section>
      <PanelCollections
        sections={[
          ...tasks,
          {
            id: "days",
            bucket: true,
            label: QUEST_SIDEBAR_COPY.dayGrid,
            content: <DayGrid />,
          },
          ...sections,
        ]}
        initialSection={initialSection}
      />
    </>
  );
}

export { DailiesPanel };
