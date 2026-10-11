import type { JSX } from "react";

// The column every project and chat page sits in. The root layout supplies
// the main landmark around it.
export default function WorkspaceLayout({
  children,
}: LayoutProps<"/">): JSX.Element {
  return <div className="page-column">{children}</div>;
}
