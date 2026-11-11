"use client";

import Link from "next/link";
import { createContext, type JSX, type ReactNode, useContext } from "react";
import { BATTERY_PURCHASES_COPY } from "@/ui/copy/battery-purchases.ts";

// The server supplies only availability, never payment configuration.
const BatteryPurchasesContext = createContext(false);

function BatteryPurchasesAvailable({
  available,
  children,
}: {
  readonly available: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <BatteryPurchasesContext value={available}>
      {children}
    </BatteryPurchasesContext>
  );
}

// Where a user who is short of batteries can get more: the link to buy
// them, or a note that purchases are unavailable.
function EarnGoldLink(): JSX.Element {
  const available = useContext(BatteryPurchasesContext);
  if (available !== true) {
    return (
      <>
        {" "}
        <span>{BATTERY_PURCHASES_COPY.unavailable}</span>
      </>
    );
  }
  return (
    <>
      {" "}
      <Link
        className="text-link"
        href="/account?section=batteries#buy-batteries"
      >
        {BATTERY_PURCHASES_COPY.heading}
      </Link>
    </>
  );
}

export { BatteryPurchasesAvailable, EarnGoldLink };
