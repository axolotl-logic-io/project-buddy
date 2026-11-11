import type { JSX } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import { wholeGold } from "@/gold/gold.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

const GOLD_HEADING_ID = "gold-heading";

// The user's batteries, in whole batteries as every page shows them: the
// number large, under a small "Batteries" label with the header's battery.
export function GoldBalance({
  microUsd,
}: {
  // The balance as the gold store reads it (src/gold/gold-store.ts).
  readonly microUsd: number;
}): JSX.Element {
  return (
    <section
      aria-labelledby={GOLD_HEADING_ID}
      className="panel workspace-part flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2 className="balance-label icon-line" id={GOLD_HEADING_ID}>
          <Icon name="battery" />
          {ACCOUNT_COPY.goldHeading}
        </h2>
        <p className="balance-amount">{wholeGold(microUsd)}</p>
      </div>
      <p className="field-hint">{ACCOUNT_COPY.goldHint}</p>
    </section>
  );
}
