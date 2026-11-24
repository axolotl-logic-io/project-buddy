import Link from "next/link";
import type { JSX } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import type { QuestId } from "@/ids.ts";
import type { Performance } from "@/performances/performance-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

function QuestPerformances({
  questId,
  performances,
}: {
  readonly questId: QuestId;
  readonly performances: readonly Performance[];
}): JSX.Element {
  if (performances.length === 0) {
    return <p>{PERFORMANCE_COPY.empty}</p>;
  }
  return (
    <ul className="grid gap-3">
      {performances.map((performance) => (
        <li key={performance.id}>
          <Link
            href={`/quests/${questId}?section=performances&performance=${performance.id}`}
          >
            {PERFORMANCE_COPY.title(
              performance.rite.name,
              performance.listName,
            )}
          </Link>
          <div className="flex flex-wrap gap-2">
            <LocalTime dateTime={performance.startedAt} detail="minute" />
            {performance.endedAt === null && (
              <span>{PERFORMANCE_COPY.active}</span>
            )}
            {performance.endedAt !== null && (
              <LocalTime dateTime={performance.endedAt} detail="minute" />
            )}
            <span>{PERFORMANCE_COPY.count(performance.added)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export { QuestPerformances };
