import Link from "next/link";
import type { JSX } from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Icon } from "@/components/ui/icon.tsx";
import type { Quest } from "@/quests/store.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";

// The quests as compact rows, each named by the quest alone; the
// whole row is the link's target, the quest's conversation.
export function QuestList({
  quests,
  emptyMessage = QUESTS_COPY.none,
}: {
  quests: Quest[];
  readonly emptyMessage?: string;
}): JSX.Element {
  if (quests.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>;
  }
  return (
    <ul className="quests-index-list">
      {quests.map((quest) => (
        <li className="quests-index-row" key={quest.id}>
          <span className="quests-index-mark">
            <Icon name="compass" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <Link
              className="card-title quests-index-link"
              href={`/quests/${quest.id}`}
            >
              {quest.name}
            </Link>

            <span className="text-muted text-sm">
              <CopyWithTime
                text={QUESTS_COPY.created(TIME_SLOT)}
                dateTime={quest.createdAt}
                detail="day"
              />
            </span>
          </div>
          <Icon name="chevron-right" />
          {quest.status !== "active" && (
            <div className="quests-index-restore">
              <QuestStatusControls quest={quest} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
