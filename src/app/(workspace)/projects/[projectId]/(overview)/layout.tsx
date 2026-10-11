import Link from "next/link";
import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function ProjectLayout({
  children,
}: LayoutProps<"/projects/[projectId]">): JSX.Element {
  return (
    <>
      <Link className="text-sm underline underline-offset-2" href="/projects">
        {COPY.projects.allProjectsLink}
      </Link>
      {children}
    </>
  );
}
