import type { JSX } from "react";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The projects page's shell: the new-project form, and the list's heading
// above the list the page streams in.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <>
      <BackLink href="/">{PROJECTS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
      <section className="panel flex flex-col gap-5">
        <h2 className="section-heading">{PROJECTS_COPY.newHeading}</h2>
        <NewProjectForm />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{PROJECTS_COPY.listHeading}</h2>
        {children}
      </section>
    </>
  );
}
