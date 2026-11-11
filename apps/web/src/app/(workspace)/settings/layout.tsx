import type { JSX, ReactNode } from "react";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

export default function RouteLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <PageFrame>
      <PageWorkspace
        title={SETTINGS_COPY.heading}
        intro={WORKSPACES_COPY.settingsIntro}
      >
        {children}
      </PageWorkspace>
    </PageFrame>
  );
}
