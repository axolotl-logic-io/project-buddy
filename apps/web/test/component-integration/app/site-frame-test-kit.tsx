import type { JSX } from "react";
import { SignedInLinks, SiteHeader } from "@/components/site-header.tsx";

// Content in the site's frame, as the root layout renders it: the header,
// with the links the @header slot gives whoever is signed in, and the main
// landmark.
async function inSiteFrame(content: JSX.Element): Promise<JSX.Element> {
  return (
    <>
      <SiteHeader links={await SignedInLinks()} />
      <main className="flex flex-1 flex-col">{content}</main>
    </>
  );
}

export { inSiteFrame };
