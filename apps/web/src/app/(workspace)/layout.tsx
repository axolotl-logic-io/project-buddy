import type { JSX } from "react";
import { RefreshPreferences } from "@/components/refresh-preferences.tsx";

// The column every project and chat page sits in. The root layout supplies
// the main landmark around it.
export default function WorkspaceLayout({
  children,
}: LayoutProps<"/">): JSX.Element {
  return (
    <div className="page-column">
      <RefreshPreferences />
      {children}
    </div>
  );
}
