import type { JSX, ReactNode } from "react";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { PageFrame } from "@/components/ui/page-frame.tsx";

export default function RouteLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <PageFrame>
      <PageWorkspace>{children}</PageWorkspace>
    </PageFrame>
  );
}
