import type { JSX } from "react";
import { extraTag } from "@/flags/flags.ts";
import { formatResetDay } from "@/quota/quota-terms.ts";
import type { MonthlyUsage } from "@/quota/spend-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { usageAmounts } from "./usage-amounts.ts";

const USAGE_HEADING_ID = "usage-heading";

// This month's spend out of the quota, as words and a meter, and the day the
// quota resets. An extra: the usage-meter switch in Settings hides it.
export function UsageMeter({
  usage,
}: {
  readonly usage: MonthlyUsage;
}): JSX.Element {
  const { spentCents, limitCents, spent, limit } = usageAmounts(usage);
  return (
    <section
      aria-labelledby={USAGE_HEADING_ID}
      className="panel flex flex-col gap-3"
      {...extraTag("usage-meter")}
    >
      <h2 className="section-heading" id={USAGE_HEADING_ID}>
        {ACCOUNT_COPY.usageHeading}
      </h2>
      <p className="field-hint">{ACCOUNT_COPY.usageHint}</p>
      <p className="font-heading text-2xl">
        {ACCOUNT_COPY.usage(spent, limit)}
      </p>
      <meter
        aria-labelledby={USAGE_HEADING_ID}
        aria-valuetext={ACCOUNT_COPY.usage(spent, limit)}
        className="h-3 w-full appearance-none overflow-hidden rounded-control border border-line bg-field [&::-moz-meter-bar]:bg-primary [&::-webkit-meter-bar]:border-0 [&::-webkit-meter-bar]:bg-field [&::-webkit-meter-optimum-value]:bg-primary"
        max={limitCents}
        min={0}
        value={Math.min(spentCents, limitCents)}
      />
      <p className="text-muted">
        {ACCOUNT_COPY.resetsOn(formatResetDay(usage.resetsOn))}
      </p>
    </section>
  );
}
