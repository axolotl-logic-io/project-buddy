import type { JSX, ReactNode } from "react";
import { QuestFrame } from "@/components/ui/page-frame.tsx";

export default function RouteLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return <QuestFrame>{children}</QuestFrame>;
}
