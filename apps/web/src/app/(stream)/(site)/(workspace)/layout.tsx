import type { JSX } from "react";

// The workspace supplies flex space; segment frames choose content width.
// The root layout supplies the main landmark around it.
export default function WorkspaceLayout({
  children,
}: Pick<LayoutProps<"/">, "children">): JSX.Element {
  return <div className="workspace-frame">{children}</div>;
}
