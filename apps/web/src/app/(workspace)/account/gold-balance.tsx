import type { JSX } from "react";
import { extraTag } from "@/flags/flags.ts";
import { wholeGold } from "@/gold/gold.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

const GOLD_HEADING_ID = "gold-heading";

// The user's gold, in whole gold as every page shows it. An extra: the
// usage-meter switch in Settings hides it.
export function GoldBalance({
  microUsd,
}: {
  // The balance as the gold store reads it (src/gold/gold-store.ts).
  readonly microUsd: number;
}): JSX.Element {
  return (
    <section
      aria-labelledby={GOLD_HEADING_ID}
      className="panel flex flex-col gap-3"
      {...extraTag("usage-meter")}
    >
      <h2 className="section-heading" id={GOLD_HEADING_ID}>
        {ACCOUNT_COPY.goldHeading}
      </h2>
      <p className="font-heading text-2xl">
        {ACCOUNT_COPY.gold(wholeGold(microUsd))}
      </p>
      <p className="field-hint">{ACCOUNT_COPY.goldHint}</p>
    </section>
  );
}
