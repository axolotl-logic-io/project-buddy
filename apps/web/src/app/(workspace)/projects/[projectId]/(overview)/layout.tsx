import type { JSX } from "react";

export default function ProjectLayout({
  children,
}: LayoutProps<"/projects/[projectId]">): JSX.Element {
  return <>{children}</>;
}
