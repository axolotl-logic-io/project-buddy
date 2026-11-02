import Link from "next/link";
import type { JSX } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import type { Milestone } from "@/milestones/milestone.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { MilestoneControls } from "./milestone-controls.tsx";

// A project's progress timeline: its milestones, newest first, each with
// the day it was recorded, a link to its chat and a way to edit or delete
// it. With none, it says how milestones arrive, without urging her on.
export function ProgressTimeline({
  milestones,
}: {
  readonly milestones: readonly Milestone[];
}): JSX.Element {
  if (milestones.length === 0) {
    return <p className="text-muted">{PROGRESS_TIMELINE_COPY.none}</p>;
  }
  return (
    <ol
      aria-label={PROGRESS_TIMELINE_COPY.heading}
      className="flex flex-col gap-3"
    >
      {milestones.map((milestone) => (
        <li className="card flex flex-col gap-2" key={milestone.id}>
          <p className="text-muted text-sm">
            <LocalTime dateTime={milestone.recordedAt} detail="day" />
          </p>
          <MilestoneControls
            milestoneId={milestone.id}
            text={milestone.text}
            chatLink={
              <Link className="text-link" href={`/chats/${milestone.chatId}`}>
                {PROGRESS_TIMELINE_COPY.openChat}
              </Link>
            }
          />
        </li>
      ))}
    </ol>
  );
}
