import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ProjectList } from "@/components/project-list.tsx";
import { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export const metadata: Metadata = { title: PROJECTS_COPY.title };

export default async function ProjectsPage(): Promise<JSX.Element> {
  const user = await requireUser();
  return <ProjectList projects={await listProjects(user.id)} />;
}
