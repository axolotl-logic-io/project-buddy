import type { JSX } from "react";
import HeaderLinks from "@/app/@header/[...path]/page.tsx";
import { SiteHeader } from "@/components/site-header.tsx";

// The site header of the page at path, as the root layout renders it with
// the @header slot: the bar, and the trail band whose heading names the
// page. The slot reads the session, the balance and the stores the trail's
// names come from, so a test that uses this mocks them.
async function siteHeaderAt(path: readonly string[]): Promise<JSX.Element> {
  return (
    <SiteHeader
      links={
        await HeaderLinks({
          params: Promise.resolve({ path: [...path] }),
          searchParams: Promise.resolve({}),
        })
      }
    />
  );
}

export { siteHeaderAt };
