import type { JSX } from "react";
import { QuestFrame } from "@/components/ui/page-frame.tsx";

export default function ProjectLayout({
  children,
}: LayoutProps<"/projects/[projectId]">): JSX.Element {
  return <QuestFrame>{children}</QuestFrame>;
}
