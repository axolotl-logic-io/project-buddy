import type { JSX } from "react";
import type { BatteryPackage } from "@/batteries/catalog.ts";
import type { batteryPurchases } from "@/db/tables/battery-purchases.ts";
import { BATTERY_PURCHASES_COPY } from "@/ui/copy/battery-purchases.ts";
import { buyBatteries, refreshBatteryPayments } from "./battery-actions.ts";

const PURCHASES_ANCHOR = "buy-batteries";
const PURCHASES_HEADING = "battery-purchases-heading";

function money(amount: number, currency: string): string {
  // Stripe amounts use the currency's minor unit, including zero-decimal currencies.
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}

export function BatteryPurchases({
  result,
  catalog,
  purchases,
}: {
  readonly result: string | undefined;
  readonly catalog: readonly BatteryPackage[];
  readonly purchases: readonly (typeof batteryPurchases.$inferSelect)[];
}): JSX.Element {
  return (
    <section
      className="panel flex flex-col gap-3"
      id={PURCHASES_ANCHOR}
      aria-labelledby={PURCHASES_HEADING}
    >
      <h2 className="section-heading" id={PURCHASES_HEADING}>
        {BATTERY_PURCHASES_COPY.heading}
      </h2>
      {catalog.length === 0 && <p>{BATTERY_PURCHASES_COPY.unavailable}</p>}
      {catalog.length > 0 && <p>{BATTERY_PURCHASES_COPY.testOnly}</p>}
      {result === "canceled" && (
        <p role="status">{BATTERY_PURCHASES_COPY.canceled}</p>
      )}
      {result === "returned" && (
        <p role="status">{BATTERY_PURCHASES_COPY.returned}</p>
      )}
      {catalog.map((offer) => (
        <form
          action={buyBatteries}
          key={offer.id}
          className="flex flex-col gap-3"
        >
          <p>
            {BATTERY_PURCHASES_COPY.package(
              offer.batteries,
              money(offer.amount, offer.currency),
            )}
          </p>
          <input type="hidden" name="package" value={offer.id} />
          <button className="button-primary" type="submit">
            {BATTERY_PURCHASES_COPY.buy}
          </button>
        </form>
      ))}
      {purchases.length > 0 && (
        <>
          <h3 className="section-heading">{BATTERY_PURCHASES_COPY.history}</h3>
          <ul>
            {purchases.map((purchase) => (
              <li key={purchase.id}>
                {BATTERY_PURCHASES_COPY.package(
                  purchase.batteries,
                  money(purchase.amount, purchase.currency),
                )}
                {BATTERY_PURCHASES_COPY.separator}
                {purchase.status === "fulfilled" &&
                  BATTERY_PURCHASES_COPY.fulfilled}
                {purchase.status === "pending" &&
                  BATTERY_PURCHASES_COPY.pending}
                {purchase.status === "expired" &&
                  BATTERY_PURCHASES_COPY.expired}
                {purchase.status === "failed" && BATTERY_PURCHASES_COPY.failed}
              </li>
            ))}
          </ul>
          <form action={refreshBatteryPayments}>
            <button type="submit" className="button-secondary">
              {BATTERY_PURCHASES_COPY.refresh}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
