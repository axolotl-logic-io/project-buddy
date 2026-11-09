import type { JSX } from "react";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

export default function AccountLayout({
  children,
}: LayoutProps<"/account">): JSX.Element {
  return (
    <PageFrame>
      <PageWorkspace
        title={ACCOUNT_COPY.heading}
        intro={WORKSPACES_COPY.accountIntro}
      >
        {children}
      </PageWorkspace>
    </PageFrame>
  );
}
