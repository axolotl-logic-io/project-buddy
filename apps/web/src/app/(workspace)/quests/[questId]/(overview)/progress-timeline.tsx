import type { JSX } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import type { QuestId } from "@/ids.ts";
import type { Milestone } from "@/milestones/milestone.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { AddMilestone, MilestoneControls } from "./milestone-controls.tsx";

// A quest's progress timeline: its milestones, newest first, each with
// the day it was recorded and a way to edit or delete it. With none, it says how milestones arrive, without urging her on.
export function ProgressTimeline({
  milestones,
  questId,
}: {
  readonly questId?: QuestId;
  readonly milestones: readonly Milestone[];
}): JSX.Element {
  if (questId === undefined && milestones.length === 0) {
    return <p className="text-muted">{PROGRESS_TIMELINE_COPY.none}</p>;
  }
  return (
    <>
      {questId !== undefined && <AddMilestone questId={questId} />}
      {milestones.length === 0 && (
        <p className="text-muted">{PROGRESS_TIMELINE_COPY.empty}</p>
      )}
      {milestones.length > 0 && (
        <ol
          aria-label={PROGRESS_TIMELINE_COPY.heading}
          className="divided-rows"
        >
          {milestones.map((milestone) => (
            <li key={milestone.id}>
              <p className="text-muted text-sm">
                <LocalTime dateTime={milestone.recordedAt} detail="day" />
              </p>
              <MilestoneControls id={milestone.id} text={milestone.text} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
