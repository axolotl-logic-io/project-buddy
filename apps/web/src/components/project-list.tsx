import Link from "next/link";
import type { JSX } from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Icon } from "@/components/ui/icon.tsx";
import type { Project } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The projects as compact rows, each named by the project alone; the
// whole row is the link's target, the quest's conversation. One whose
// conversation has messages the user hasn't read, such as a check-in, is
// marked as unread.
export function ProjectList({
  projects,
  emptyMessage = PROJECTS_COPY.none,
}: {
  projects: Project[];
  readonly emptyMessage?: string;
}): JSX.Element {
  if (projects.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>;
  }
  return (
    <ul className="quests-index-list">
      {projects.map((project) => (
        <li className="quests-index-row" key={project.id}>
          <span className="quests-index-mark">
            <Icon name="compass" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <Link
              className="card-title quests-index-link"
              href={`/projects/${project.id}`}
            >
              {project.name}
            </Link>
            {project.unread === true && (
              <span className="self-start rounded-control border border-primary px-2 text-sm">
                {PROJECTS_COPY.unread}
              </span>
            )}

            <span className="text-muted text-sm">
              <CopyWithTime
                text={PROJECTS_COPY.created(TIME_SLOT)}
                dateTime={project.createdAt}
                detail="day"
              />
            </span>
          </div>
          <Icon name="chevron-right" />
          {project.status !== "active" && (
            <div className="quests-index-restore">
              <QuestStatusControls project={project} restoreOnly={true} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
