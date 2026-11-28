import type { JSX, ReactNode } from "react";
import { currentUser } from "@/auth/current-user.ts";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { ReportExperienceTotal } from "@/components/experience/experience-feedback.tsx";
import { AccountLinks, PageHeader } from "@/components/page-header.tsx";
import { Trail } from "@/components/pending-page.tsx";
import { SitePanel } from "@/components/site-panel.tsx";
import { readExperience } from "@/experience/experience-store.ts";
import { SignedInVisits } from "@/visits/signed-in-visits.tsx";

// Attach the page trail and the site panel for the current session.
async function SignedInHeader({
  breadcrumbs,
}: {
  readonly breadcrumbs?: readonly Breadcrumb[];
} = {}): Promise<JSX.Element> {
  const user = await currentUser();
  let trail: ReactNode;
  if (breadcrumbs !== undefined) {
    trail = <Trail items={breadcrumbs} />;
  }
  if (user === undefined) {
    return (
      <>
        <PageHeader trail={trail} />
        <ReportExperienceTotal />
      </>
    );
  }
  const experience = await readExperience(user.id);
  return (
    <>
      <PageHeader
        panel={<SitePanel links={<AccountLinks />} />}
        trail={trail}
      />
      <ReportExperienceTotal
        snapshot={{ user: user.id, total: experience.experience }}
      />
      <SignedInVisits key={user.id} />
    </>
  );
}

export { SignedInHeader };
