// How the account page states a month's usage: in cents, for the meter,
// and in dollars and cents, such as "$1.25" of "$5.00".
import type { MonthlyUsage } from "@/quota/spend-store.ts";

const MICRO_USD_PER_CENT = 10_000;
const CENTS_PER_DOLLAR = 100;

const DOLLARS = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
});

interface UsageAmounts {
  readonly spentCents: number;
  readonly limitCents: number;
  readonly spent: string;
  readonly limit: string;
}

function dollars(cents: number): string {
  return DOLLARS.format(cents / CENTS_PER_DOLLAR);
}

// The spend rounds up to the cent, so any use shows, even a fraction of a
// cent. While the spend is under the limit it shows at most a cent less
// than the limit: the page never shows the limit reached before the chat
// refuses messages (quota.ts refuses at the limit).
function usageAmounts(usage: MonthlyUsage): UsageAmounts {
  const limitCents = usage.limitMicroUsd / MICRO_USD_PER_CENT;
  let spentCents = Math.ceil(usage.spentMicroUsd / MICRO_USD_PER_CENT);
  if (usage.spentMicroUsd < usage.limitMicroUsd) {
    spentCents = Math.min(spentCents, limitCents - 1);
  }
  return {
    spentCents,
    limitCents,
    spent: dollars(spentCents),
    limit: dollars(limitCents),
  };
}

export { usageAmounts };
