import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";

export default function ProjectLayout({
  children,
}: LayoutProps<"/projects/[projectId]">): JSX.Element {
  return <PageFrame>{children}</PageFrame>;
}
