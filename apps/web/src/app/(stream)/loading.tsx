import { headers } from "next/headers";
import type { JSX } from "react";
import { SiteHeader } from "@/components/site-header.tsx";

import { completePageAddress, PAGE_ADDRESS_HEADER } from "@/page-delivery.ts";

// The boundary above the shared site layout streams this shell on first load.
export default async function SiteLoading(): Promise<JSX.Element> {
  const address = (await headers()).get(PAGE_ADDRESS_HEADER);
  return (
    <>
      <SiteHeader loading={true} panel={null} />
      <main className="flex flex-1 flex-col" />
      {address !== null && (
        <noscript>
          <meta
            content={`0;url=${completePageAddress(address)}`}
            httpEquiv="refresh"
          />
        </noscript>
      )}
    </>
  );
}
