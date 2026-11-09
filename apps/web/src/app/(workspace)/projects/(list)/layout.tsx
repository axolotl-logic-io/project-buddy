import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { NewProjectDialog } from "@/components/new-project-dialog.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { HOME_PATH } from "@/routes.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The quests page's New quest dialog sits above the streamed list.
export default async function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): Promise<JSX.Element> {
  const user = await requireUser();
  const choices = await questCreationChoices(user.id);
  return (
    <>
      <BackLink href={HOME_PATH}>{PROJECTS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
      <NewProjectDialog choices={choices} />
      {children}
    </>
  );
}
