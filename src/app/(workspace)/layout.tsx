import type { JSX } from "react";

export default function WorkspaceLayout({
  children,
}: LayoutProps<"/">): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      {children}
    </main>
  );
}
