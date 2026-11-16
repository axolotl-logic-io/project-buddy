import type { JSX } from "react";
import { SignedInHeader } from "@/components/site-header.tsx";

// The header at the root redirect.
export default function RootHeader(): Promise<JSX.Element> {
  return SignedInHeader();
}
