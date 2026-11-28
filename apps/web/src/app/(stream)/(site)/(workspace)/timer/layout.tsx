import type { JSX, ReactNode } from "react";
import { TimerFrame } from "@/components/ui/page-frame.tsx";

export default function TimerLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return <TimerFrame>{children}</TimerFrame>;
}
