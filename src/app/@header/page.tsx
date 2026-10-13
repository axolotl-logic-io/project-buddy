import type { JSX } from "react";
import { SignedInLinks } from "@/components/site-header.tsx";

// The header's links on the home page.
export default function HomeHeaderLinks(): JSX.Element {
  return <SignedInLinks />;
}
