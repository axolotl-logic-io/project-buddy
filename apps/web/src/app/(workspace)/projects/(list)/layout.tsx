import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <PageFrame>
      <div className="quests-index">
        <header className="quests-index-heading">
          <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
        </header>
        {children}
      </div>
    </PageFrame>
  );
}
