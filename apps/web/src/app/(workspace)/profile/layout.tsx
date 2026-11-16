import type { JSX, ReactNode } from "react";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";

export default function RouteLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <PageFrame>
      <PageWorkspace intro={PROFILE_COPY.intro}>{children}</PageWorkspace>
    </PageFrame>
  );
}
