import type { JSX } from "react";
import { ChevronDownIcon } from "@/components/ui/icons.tsx";
import type { ProjectId } from "@/ids.ts";
import type { MemoryAuthor, MemoryVersion } from "@/memory/memory.ts";
import { COPY } from "@/ui/copy.ts";
import { RestoreVersionForm } from "./restore-version-form.tsx";

const madeAt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const AUTHOR_NAMES: Readonly<Record<MemoryAuthor, string>> = {
  user: COPY.memory.byUser,
  tutor: COPY.memory.byTutor,
};

// Every version of the project's memory, newest first, with who made it and
// when, its text on request, and a way to restore each earlier one.
export function MemoryHistory({
  projectId,
  history,
}: {
  projectId: ProjectId;
  history: readonly MemoryVersion[];
}): JSX.Element {
  const [newest] = history;
  if (newest === undefined) {
    return <p className="text-muted">{COPY.memory.noHistory}</p>;
  }
  return (
    <ol aria-label={COPY.memory.historyHeading} className="flex flex-col gap-3">
      {history.map((entry) => (
        <li className="card flex flex-col gap-2" key={entry.version}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p>
              <span className="font-semibold">
                {COPY.memory.versionHeading(entry.version)}
              </span>{" "}
              {entry === newest && (
                <span className="text-muted">{COPY.memory.newest}</span>
              )}
            </p>
            <p className="text-muted text-sm">
              {COPY.memory.versionMade(
                AUTHOR_NAMES[entry.author],
                madeAt.format(entry.createdAt),
              )}
            </p>
          </div>
          <details className="group text-sm">
            <summary className="button-quiet cursor-pointer list-none">
              <ChevronDownIcon className="-rotate-90 transition-transform group-open:rotate-0 motion-reduce:transition-none" />
              {COPY.memory.showText}
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
