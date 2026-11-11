import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";

// Quests' heading is the trail band's, in the site header.
export default function ProjectListLayout({
  children,
}: LayoutProps<"/projects">): JSX.Element {
  return (
    <PageFrame>
      <div className="quests-index">{children}</div>
    </PageFrame>
  );
}
