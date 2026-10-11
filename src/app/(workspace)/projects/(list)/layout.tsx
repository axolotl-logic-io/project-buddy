import Link from "next/link";
import type { JSX } from "react";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { COPY } from "@/ui/copy.ts";

export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <>
      <Link className="back-link" href="/">
        {COPY.projects.homeLink}
      </Link>
      <h1 className="page-heading">{COPY.projects.heading}</h1>
      <NewProjectForm />
      {children}
    </>
  );
}
