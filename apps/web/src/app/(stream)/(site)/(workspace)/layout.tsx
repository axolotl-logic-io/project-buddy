import type { JSX } from "react";
import { PendingMain } from "@/components/pending-page.tsx";

// The workspace supplies flex space; segment frames choose content width.
// The root layout supplies the main landmark around it. A page the user
// opens shows here before the server's arrives.
export default function WorkspaceLayout({
  children,
}: Pick<LayoutProps<"/">, "children">): JSX.Element {
  return (
    <div className="workspace-frame">
      <PendingMain>{children}</PendingMain>
    </div>
  );
}
