import type { JSX, ReactNode } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";

export default function TimerLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return <PageFrame>{children}</PageFrame>;
}
