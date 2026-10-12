import type { JSX } from "react";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { COPY } from "@/ui/copy.ts";

// The projects page's shell: the new-project form, and the list's heading
// above the list the page streams in.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <>
      <BackLink href="/">{COPY.projects.homeLink}</BackLink>
      <h1 className="page-heading">{COPY.projects.heading}</h1>
      <section className="panel flex flex-col gap-5">
        <h2 className="section-heading">{COPY.projects.newHeading}</h2>
        <NewProjectForm />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="section-heading">{COPY.projects.listHeading}</h2>
        {children}
      </section>
    </>
  );
}
