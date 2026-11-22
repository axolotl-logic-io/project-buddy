import type { JSX } from "react";
import type { Murmling } from "@/spaces/murmling-store.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";

function NextTask({
  task,
}: {
  readonly task: Murmling | undefined;
}): JSX.Element {
  return (
    <div className="quest-overview-feature">
      <h3 className="quest-overview-label">{QUEST_SIDEBAR_COPY.nextTask}</h3>
      {task !== undefined && (
        <p className="wrap-anywhere font-heading font-semibold text-lg">
          {task.taskNumber !== null && (
            <span className="font-mono text-muted text-xs">
              {SPACES_COPY.taskNumber(task.taskNumber)}{" "}
            </span>
          )}
          {task.text}
        </p>
      )}
      {task === undefined && (
        <p className="text-muted">{QUEST_SIDEBAR_COPY.noNextTask}</p>
      )}
    </div>
  );
}

export { NextTask };
