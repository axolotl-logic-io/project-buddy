import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import { Icon } from "@/components/ui/icon.tsx";
import type { Project } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The id of a team project's mark, which describes the project's link, so
// moving from link to link still announces it; undefined for a project no
// one else is in.
function sharedMarkId(project: Project): string | undefined {
  if (!project.shared) {
    return undefined;
  }
  return `shared-${project.id}`;
}

// A team project's mark: shared by the user, who owns it, or shared with
// them, a member. Outside the link, so the link's name stays the project's.
function SharedMark({ project }: { readonly project: Project }): ReactNode {
  const id = sharedMarkId(project);
  if (id === undefined) {
    return null;
  }
  let text: string = PROJECTS_COPY.shared;
  if (project.role === "member") {
    text = PROJECTS_COPY.sharedWithYou;
  }
  return (
    <span
      id={id}
      className="self-start rounded-control border border-line px-2 text-sm"
    >
      {text}
    </span>
  );
}

// The projects as compact rows, each named by the project alone; the
// whole row is the link's target, the quest's conversation. A team project
// is marked as shared.
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
              aria-describedby={sharedMarkId(project)}
              className="card-title quests-index-link"
              href={`/projects/${project.id}`}
            >
              {project.name}
            </Link>
            <SharedMark project={project} />

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
