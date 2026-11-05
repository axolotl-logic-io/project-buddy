import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { CopyWithTime } from "@/components/copy-with-time.tsx";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { TIME_SLOT } from "@/components/time-format.ts";
import type { Project } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

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

// The projects as cards, each a link to its project named by the project's
// name alone; the whole card is the link's target. A team project is
// marked as shared.
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
    <ul className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <li className="link-card flex flex-col gap-1" key={project.id}>
          <Link
            aria-describedby={sharedMarkId(project)}
            className="card-title"
            href={`/projects/${project.id}`}
          >
            {project.name}
          </Link>
          <SharedMark project={project} />
          <span className="text-muted text-sm">
            {QUEST_STATUS_COPY.labels[project.status]}
          </span>
          {project.status !== "active" && (
            <div className="relative z-10">
              <QuestStatusControls project={project} restoreOnly={true} />
            </div>
          )}
          <span className="text-muted text-sm">
            <CopyWithTime
              text={PROJECTS_COPY.created(TIME_SLOT)}
              dateTime={project.createdAt}
              detail="day"
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
