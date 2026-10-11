import Link from "next/link";
import type { JSX } from "react";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { COPY } from "@/ui/copy.ts";

export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <>
      <Link className="text-sm underline underline-offset-2" href="/">
        {COPY.projects.homeLink}
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">
        {COPY.projects.heading}
      </h1>
      <NewProjectForm />
      {children}
    </>
  );
}
