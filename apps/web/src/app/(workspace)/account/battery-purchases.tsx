import type { JSX } from "react";
import type { BatteryPackage } from "@/batteries/catalog.ts";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
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

// What came of a purchase, by its status, as its history line says it. A
// status this build doesn't know says nothing.
const PURCHASE_STATUS: ReadonlyMap<string, string> = new Map([
  ["fulfilled", BATTERY_PURCHASES_COPY.fulfilled],
  ["pending", BATTERY_PURCHASES_COPY.pending],
  ["expired", BATTERY_PURCHASES_COPY.expired],
  ["failed", BATTERY_PURCHASES_COPY.failed],
]);

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
      className="panel workspace-part flex flex-col gap-3"
      id={PURCHASES_ANCHOR}
      aria-labelledby={PURCHASES_HEADING}
    >
      <h2 className="section-heading" id={PURCHASES_HEADING}>
        {BATTERY_PURCHASES_COPY.heading}
      </h2>
      {catalog.length === 0 && <p>{BATTERY_PURCHASES_COPY.unavailable}</p>}
      {catalog.length > 0 && <p>{BATTERY_PURCHASES_COPY.testOnly}</p>}
      {result === "canceled" && (
        <Notice role="status">{BATTERY_PURCHASES_COPY.canceled}</Notice>
      )}
      {result === "returned" && (
        <Notice role="status">{BATTERY_PURCHASES_COPY.returned}</Notice>
      )}
      {catalog.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {catalog.map((offer) => (
            <li key={offer.id}>
              <form
                action={buyBatteries}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <p>
                  {BATTERY_PURCHASES_COPY.package(
                    offer.batteries,
                    money(offer.amount, offer.currency),
                  )}
                </p>
                <input type="hidden" name="package" value={offer.id} />
                <Button type="submit">{BATTERY_PURCHASES_COPY.buy}</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {purchases.length > 0 && (
        <>
          <h3 className="section-heading">{BATTERY_PURCHASES_COPY.history}</h3>
          <ul className="flex flex-col divide-y divide-line">
            {purchases.map((purchase) => (
              <li className="flex flex-col gap-1 py-3" key={purchase.id}>
                <span>
                  {BATTERY_PURCHASES_COPY.package(
                    purchase.batteries,
                    money(purchase.amount, purchase.currency),
                  )}
                </span>
                <span className="field-hint">
                  {PURCHASE_STATUS.get(purchase.status)}
                </span>
              </li>
            ))}
          </ul>
          <form action={refreshBatteryPayments}>
            <Button type="submit" variant="secondary">
              {BATTERY_PURCHASES_COPY.refresh}
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
