import type { JSX } from "react";
import { PageHeader } from "@/components/page-header.tsx";
import { COMPLETE_PAGE_PATH } from "@/page-delivery.ts";

// The boundary above the shared site layout streams this shell on first
// load. A browser without scripting can't reveal what streams after it, so
// it asks for complete pages instead, and comes back to this one.
export default function SiteLoading(): JSX.Element {
  return (
    <>
      <PageHeader loading={true} panel={null} />
      <main className="flex flex-1 flex-col" />
      <noscript>
        <meta content={`0;url=${COMPLETE_PAGE_PATH}`} httpEquiv="refresh" />
      </noscript>
    </>
  );
}
