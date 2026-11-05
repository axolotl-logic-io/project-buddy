import type { JSX } from "react";
import { NewProjectDialog } from "@/components/new-project-dialog.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { HOME_PATH } from "@/routes.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The projects page's shell: the "New project" button, whose dialog holds
// the new-project form, above the invitations and list the page streams
// in. Her own constructs, for the form's
// construct picker, are passed on unawaited, so the shell still prerenders and
// the picker streams them in inside its own Suspense boundary.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <>
      <BackLink href={HOME_PATH}>{PROJECTS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
      <NewProjectDialog userConstructs={ownConstructChoices()} />
      {children}
    </>
  );
}
