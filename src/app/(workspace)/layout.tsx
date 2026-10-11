import type { JSX } from "react";

// The column every project and chat page sits in. The root layout supplies
// the main landmark around it.
export default function WorkspaceLayout({
  children,
}: LayoutProps<"/">): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      {children}
    </div>
  );
}
