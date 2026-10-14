import type { JSX } from "react";
import { SignedInLinks } from "@/components/site-header.tsx";

// The header's links on every page but the home page.
export default function HeaderLinks(): JSX.Element {
  return <SignedInLinks />;
}
