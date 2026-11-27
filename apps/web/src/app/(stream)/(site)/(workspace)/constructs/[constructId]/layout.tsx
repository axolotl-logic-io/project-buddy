import type { JSX, ReactNode } from "react";
import { EditorFrame } from "@/components/ui/page-frame.tsx";

export default function RouteLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return <EditorFrame>{children}</EditorFrame>;
}
