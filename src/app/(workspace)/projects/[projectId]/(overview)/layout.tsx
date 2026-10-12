import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { COPY } from "@/ui/copy.ts";

export default function ProjectLayout({
  children,
}: LayoutProps<"/projects/[projectId]">): JSX.Element {
  return (
    <>
      <BackLink href="/projects">{COPY.projects.allProjectsLink}</BackLink>
      {children}
    </>
  );
}
