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
// signed-in site panel and the page's trail, or the visitor's header.
async function SignedInHeader({
  breadcrumbs,
}: {
  readonly breadcrumbs?: readonly Breadcrumb[];
} = {}): Promise<JSX.Element> {
  const user = await currentUser();
  if (user === undefined) {
    return <SiteHeader />;
  }
  let trail: ReactNode;
  if (breadcrumbs !== undefined) {
    trail = <TrailBand items={breadcrumbs} />;
  }
  return (
    <SiteHeader panel={<SitePanel links={<AccountLinks />} />} trail={trail} />
  );
}

export { SignedInHeader };
