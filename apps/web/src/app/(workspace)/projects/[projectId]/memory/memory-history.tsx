import type { JSX } from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Icon } from "@/components/ui/icon.tsx";
import type { ProjectId, UserId } from "@/ids.ts";
import type { MemoryVersion } from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { RestoreVersionForm } from "./restore-version-form.tsx";

// Who saved the version, as the viewer reads it: the buddy; "you" for the
// viewer's own; another person by name; or, when nobody is recorded,
// someone in the project.
function saverName({ author, savedBy }: MemoryVersion, viewer: UserId): string {
  if (author === "buddy") {
    return MEMORY_COPY.byBuddy;
  }
  if (savedBy === undefined) {
    return MEMORY_COPY.bySomeone;
  }
  if (savedBy.id === viewer) {
    return MEMORY_COPY.byViewer;
  }
  return savedBy.name;
}

// Every version of the project's memory, newest first, with who saved it and
// when, its text on request, and a way to restore each earlier one.
export function MemoryHistory({
  projectId,
  history,
  viewer,
}: {
  projectId: ProjectId;
  history: readonly MemoryVersion[];
  viewer: UserId;
}): JSX.Element {
  const [newest] = history;
  if (newest === undefined) {
    return <p className="text-muted">{MEMORY_COPY.noHistory}</p>;
  }
  return (
    <ol aria-label={MEMORY_COPY.historyHeading} className="flex flex-col gap-3">
      {history.map((entry) => (
        <li className="card flex flex-col gap-2" key={entry.version}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p>
              <span className="font-semibold">
                {MEMORY_COPY.versionHeading(entry.version)}
              </span>{" "}
              {entry === newest && (
                <span className="text-muted">{MEMORY_COPY.newest}</span>
              )}
            </p>
            <p className="text-muted text-sm sm:flex-1 sm:text-end">
              <CopyWithTime
                text={MEMORY_COPY.versionMade(
                  saverName(entry, viewer),
                  TIME_SLOT,
                )}
                dateTime={entry.createdAt}
                detail="minute"
              />
            </p>
          </div>
          <details className="group text-sm">
            <summary className="button-quiet cursor-pointer list-none">
              <Icon
                className="-rotate-90 transition-transform group-open:rotate-0 motion-reduce:transition-none"
                name="chevron-down"
              />
              {MEMORY_COPY.showText}
            </summary>
            <p className="mt-2 whitespace-pre-wrap rounded-control bg-code-surface p-3 font-mono">
              {entry.text}
            </p>
          </details>
          {entry !== newest && (
            <RestoreVersionForm
              basedOn={newest.version}
              projectId={projectId}
              version={entry.version}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
