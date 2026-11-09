import type { JSX, ReactNode } from "react";
import { HomeFrame } from "@/components/ui/page-frame.tsx";

export default function RouteLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return <HomeFrame>{children}</HomeFrame>;
}
