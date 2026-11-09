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

// Compatibility name: Marketplace sales never fund model use after the
// orb migration, regardless of its activation gate.
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
      <Link className="text-link" href="/account#buy-batteries">
        {BATTERY_PURCHASES_COPY.heading}
      </Link>
    </>
  );
}

export { BatteryPurchasesAvailable, EarnGoldLink };
