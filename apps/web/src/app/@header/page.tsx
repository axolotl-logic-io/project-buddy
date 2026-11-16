import type { JSX } from "react";
import { SignedInHeader } from "@/components/signed-in-header.tsx";

// The header at the root redirect.
export default function RootHeader(): Promise<JSX.Element> {
  return SignedInHeader();
}
