import type { Metadata } from "next";
import { connection } from "next/server";
import type { JSX } from "react";
import { ProjectList } from "@/components/project-list.tsx";
import { listProjects } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

export const metadata: Metadata = { title: COPY.projects.title };

export default async function ProjectsPage(): Promise<JSX.Element> {
  await connection();
  return <ProjectList projects={await listProjects()} />;
}
