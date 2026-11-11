import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// Quests' heading and introduction, flush on the page as Workshop's are,
// shown at once while the page's quests load beneath them.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <PageFrame>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">{PROJECTS_COPY.heading}</h1>
        <p className="text-muted">{PROJECTS_COPY.intro}</p>
      </div>
      {children}
    </PageFrame>
  );
}
