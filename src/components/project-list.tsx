import Link from "next/link";
import type { JSX } from "react";
import type { Project } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const createdAt = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

// The projects as cards, each a link to its project named by the project's
// name alone; the whole card is the link's target.
export function ProjectList({
  projects,
}: {
  projects: Project[];
}): JSX.Element {
  if (projects.length === 0) {
    return <p className="text-muted">{COPY.projects.none}</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <li
          className="card relative flex flex-col gap-1 hover:border-primary"
          key={project.id}
        >
          <Link
            className="font-heading font-semibold text-lg after:absolute after:inset-0 after:rounded-box hover:text-primary"
            href={`/projects/${project.id}`}
          >
            {project.name}
          </Link>
          <span className="text-muted text-sm">
            {COPY.projects.created(createdAt.format(project.createdAt))}
          </span>
        </li>
      ))}
    </ul>
  );
}
