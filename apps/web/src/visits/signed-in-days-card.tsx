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
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <strong className="font-bold font-heading text-site-title-wide tabular-nums">
          {days.total}
        </strong>{" "}
        <span>{PROFILE_COPY.daysUnit(days.total)}</span>
      </p>
      <p>{PROFILE_COPY.daysExplanation}</p>
      <p className="text-muted text-sm">
        {PROFILE_COPY.daysTracking(days.trackedSince)}
      </p>
    </section>
  );
}

export { SignedInDaysCard };
