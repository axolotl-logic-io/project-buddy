import type { JSX } from "react";
import { NewProjectDialog } from "@/components/new-project-dialog.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The quests page's New quest dialog sits above the streamed list.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <>
      <BackLink href={HOME_PATH}>{PROJECTS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
      <NewProjectDialog />
      {children}
    </>
  );
}
