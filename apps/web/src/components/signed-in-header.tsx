import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import {
  AccountLinks,
  SiteHeader,
  TrailBand,
} from "@/components/site-header.tsx";
import { SitePanel } from "@/components/site-panel.tsx";

// Reads the session for the header slot and supplies the header with the
// page's trail and the signed-in site panel, or the visitor's panel. A
// visitor is given only the trail of a page anyone may open
// (publicBreadcrumbs in header-breadcrumbs.ts).
async function SignedInHeader({
  breadcrumbs,
}: {
  readonly breadcrumbs?: readonly Breadcrumb[];
} = {}): Promise<JSX.Element> {
  const user = await currentUser();
  let trail: ReactNode;
  if (breadcrumbs !== undefined) {
    trail = <TrailBand items={breadcrumbs} />;
  }
  if (user === undefined) {
    return <SiteHeader trail={trail} />;
  }
  return (
    <SiteHeader panel={<SitePanel links={<AccountLinks />} />} trail={trail} />
  );
}

export { SignedInHeader };
