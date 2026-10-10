import Link from "next/link";
import type { JSX } from "react";
import type { Project } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

export function ProjectList({
  projects,
}: {
  projects: Project[];
}): JSX.Element {
  if (projects.length === 0) {
    return <p className="text-muted">{COPY.projects.none}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            className="underline underline-offset-2"
            href={`/projects/${project.id}`}
          >
            {project.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
