import type { JSX } from "react";
import { SiteHeader } from "@/components/site-header.tsx";

// The boundary above the shared site layout streams this shell on first load.
export default function SiteLoading(): JSX.Element {
  return (
    <>
      <SiteHeader loading={true} panel={null} />
      <main className="flex flex-1 flex-col" />
    </>
  );
}
