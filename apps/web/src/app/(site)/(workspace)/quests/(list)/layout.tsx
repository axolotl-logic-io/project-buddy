import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";

// Quests' heading is the trail band's, in the site header. Its
// introduction sits flush on the page, shown at once while the page's
// quests load beneath it.
export default function QuestListLayout({
  children,
}: LayoutProps<"/quests">): JSX.Element {
  return <PageFrame>{children}</PageFrame>;
}
