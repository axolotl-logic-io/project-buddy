import type { JSX } from "react";
import { QuestFrame } from "@/components/ui/page-frame.tsx";

export default function QuestLayout({
  children,
}: LayoutProps<"/quests/[questId]">): JSX.Element {
  return <QuestFrame>{children}</QuestFrame>;
}
