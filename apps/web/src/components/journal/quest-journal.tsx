import type { JSX } from "react";
import { SectionEditor } from "@/components/journal/section-controls.tsx";
import type { ProjectId, UserId } from "@/ids.ts";
import { readSection } from "@/journal/journal-store.ts";

async function QuestJournal({
  owner,
  projectId,
}: {
  readonly owner: UserId;
  readonly projectId: ProjectId;
}): Promise<JSX.Element> {
  const [goal, preferences] = await Promise.all([
    readSection(owner, projectId, "goal"),
    readSection(owner, projectId, "preferences"),
  ]);
  return (
    <>
      {goal !== undefined && (
        <SectionEditor projectId={projectId} initial={goal} />
      )}
      {preferences !== undefined && (
        <SectionEditor projectId={projectId} initial={preferences} />
      )}
    </>
  );
}

export { QuestJournal };
