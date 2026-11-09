import type { JSX } from "react";
import { NewProjectDialog } from "@/components/new-project-dialog.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The quests page's New quest dialog sits above the streamed list.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <>
      <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
      <NewProjectDialog />
      {children}
    </>
  );
}
