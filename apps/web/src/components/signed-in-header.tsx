import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import {
  CircleProgress,
  ReportExperienceTotal,
} from "@/components/experience/circle-progress.tsx";
import {
  AccountLinks,
  SiteHeader,
  TrailBand,
} from "@/components/site-header.tsx";
import { SitePanel } from "@/components/site-panel.tsx";
import { readExperience } from "@/experience/experience-store.ts";
import { SignedInVisits } from "@/visits/signed-in-visits.tsx";

// Reads the session for the header slot and supplies the header with the
// page's trail and either the signed-in site panel and the ring of the
// user's progress toward their next circle, or the visitor's panel. A
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
    return (
      <>
        <SiteHeader trail={trail} />
        <ReportExperienceTotal />
      </>
    );
  }
  const experience = await readExperience(user.id);
  return (
    <SiteHeader
      panel={<SitePanel links={<AccountLinks />} />}
      ring={
        <>
          <CircleProgress experience={experience} />
          <ReportExperienceTotal
            snapshot={{ user: user.id, total: experience.experience }}
          />
          <SignedInVisits key={user.id} />
        </>
      }
      trail={trail}
    />
  );
}

export { SignedInHeader };
