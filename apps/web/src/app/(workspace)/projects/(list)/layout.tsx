import type { JSX } from "react";
import { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import { NewProjectDialog } from "@/components/new-project-dialog.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The projects page's shell: the "New project" button, whose dialog holds
// the new-project form, and the list's heading above the list the page
// streams in. Her own buddies, for the form's
// buddy picker, are passed on unawaited, so the shell still prerenders and
// the picker streams them in inside its own Suspense boundary.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <>
      <BackLink href="/">{PROJECTS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
      <NewProjectDialog userBuddies={ownBuddyChoices()} />
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{PROJECTS_COPY.listHeading}</h2>
        {children}
      </section>
    </>
  );
}
