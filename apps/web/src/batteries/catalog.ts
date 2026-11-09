import { z } from "zod";
import { readBatteryPayments } from "@/env.ts";

const MAX_PACKAGE_ID = 80;
const MAX_BATTERIES = 1_000_000;
const MAX_AMOUNT = 100_000_000;
const MAX_PACKAGES = 20;
const PRICE = /^price_[A-Za-z0-9]+$/u;
const PACKAGE = z.object({
  id: z.string().min(1).max(MAX_PACKAGE_ID),
  priceId: z.string().regex(PRICE),
  batteries: z.number().int().positive().max(MAX_BATTERIES),
  amount: z.number().int().positive().max(MAX_AMOUNT),
  currency: z.enum(["usd", "eur", "gbp"]),
});
type BatteryPackage = z.infer<typeof PACKAGE>;
const CATALOG = z
  .array(PACKAGE)
  .max(MAX_PACKAGES)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
  );

function batteryCatalog(): BatteryPackage[] {
  const config = readBatteryPayments();
  if (config === undefined) {
    return [];
  }
  return CATALOG.parse(JSON.parse(config.catalog));
}

export type { BatteryPackage };
export { batteryCatalog };
