import type { JSX } from "react";
import { SignedInLinks } from "@/components/site-header.tsx";

// The header's links at the root redirect.
export default function RootHeaderLinks(): Promise<JSX.Element> {
  return SignedInLinks();
}
