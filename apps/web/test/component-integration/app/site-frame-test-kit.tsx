import type { JSX } from "react";
import { SignedInLinks, SiteHeader } from "@/components/site-header.tsx";

// Content in the site's frame, as the root layout renders it: the header,
// with the menu the @header slot gives whoever is signed in, and the main
// landmark. header replaces the header, such as one with the page's trail
// band (siteHeaderAt in site-header-test-kit.tsx).
async function inSiteFrame(
  content: JSX.Element,
  header?: JSX.Element,
): Promise<JSX.Element> {
  return (
    <>
      {header ?? <SiteHeader links={await SignedInLinks()} />}
      <main className="flex flex-1 flex-col">{content}</main>
    </>
  );
}

export { inSiteFrame };
