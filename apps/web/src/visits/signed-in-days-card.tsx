import type { JSX } from "react";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import type { SignedInDays } from "@/visits/signed-in-days-store.ts";

function SignedInDaysCard({
  days,
}: {
  readonly days: SignedInDays;
}): JSX.Element {
  return (
    <section
      aria-label={PROFILE_COPY.daysHeading}
      className="signed-in-days-card"
    >
      <h2 className="font-bold font-heading text-section-heading">
        {PROFILE_COPY.daysHeading}
      </h2>
      <p className="font-bold text-page-heading tabular-nums">
        {PROFILE_COPY.daysTotal(days.total)}
      </p>
      <p>{PROFILE_COPY.daysExplanation}</p>
      <p className="text-muted text-sm">
        {PROFILE_COPY.daysTracking(days.trackedSince)}
      </p>
    </section>
  );
}

export { SignedInDaysCard };
