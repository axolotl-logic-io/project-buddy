import Link from "next/link";
import type { JSX } from "react";
import { BATTERY_PURCHASES_COPY } from "@/ui/copy/battery-purchases.ts";

// Compatibility component name: model-use Batteries come from Account,
// without buying or converting Marketplace currency.
export function EarnGoldLink(): JSX.Element {
  return (
    <>
      {" "}
      <Link className="text-link" href="/account#buy-batteries">
        {BATTERY_PURCHASES_COPY.heading}
      </Link>
    </>
  );
}
