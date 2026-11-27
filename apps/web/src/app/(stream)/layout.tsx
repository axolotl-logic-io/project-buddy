import type { ReactNode } from "react";

// This segment owns the document shell. Its site child keeps the header
// and main together through the router's transitions.
export default function StreamLayout({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  return children;
}
