import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export default function ProjectLayout({
  children,
}: LayoutProps<"/projects/[projectId]">): JSX.Element {
  return (
    <>
      <BackLink href="/projects">{PROJECTS_COPY.allProjectsLink}</BackLink>
      {children}
    </>
  );
}
