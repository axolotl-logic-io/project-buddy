import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// Quests' heading is the trail band's, in the site header. Its
// introduction sits flush on the page, shown at once while the page's
// quests load beneath it.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <PageFrame>
      <p className="text-muted">{PROJECTS_COPY.intro}</p>
      {children}
    </PageFrame>
  );
}
