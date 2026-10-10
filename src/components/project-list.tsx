import Link from "next/link";
import type { Project } from "@/projects/store";

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No projects yet.</p>;
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
