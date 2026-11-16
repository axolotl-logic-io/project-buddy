import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { CircleProgress } from "@/components/experience/circle-progress.tsx";
import {
  AccountLinks,
  SiteHeader,
  TrailBand,
} from "@/components/site-header.tsx";
import { SitePanel } from "@/components/site-panel.tsx";
import { readExperience } from "@/experience/experience-store.ts";

// Reads the session for the header slot and supplies the header with the
// signed-in site panel, the ring of the user's progress toward their next
// circle and the page's trail, or the visitor's header.
async function SignedInHeader({
  breadcrumbs,
}: {
  readonly breadcrumbs?: readonly Breadcrumb[];
} = {}): Promise<JSX.Element> {
  const user = await currentUser();
  if (user === undefined) {
    return <SiteHeader />;
  }
  const experience = await readExperience(user.id);
  let trail: ReactNode;
  if (breadcrumbs !== undefined) {
    trail = <TrailBand items={breadcrumbs} />;
  }
  return (
    <SiteHeader
      panel={<SitePanel links={<AccountLinks />} />}
      ring={<CircleProgress experience={experience} />}
      trail={trail}
    />
  );
}

export { SignedInHeader };
