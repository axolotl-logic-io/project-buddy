"use client";

import Link from "next/link";
import { createContext, type JSX, type ReactNode, useContext } from "react";
import { BATTERY_PURCHASES_COPY } from "@/ui/copy/battery-purchases.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";

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

// Compatibility name. Until #779's operator cutover, sales still earn the
// shared balance. Marketplace buyers always need Marketplace guidance.
function EarnGoldLink({
  marketplace = false,
}: {
  readonly marketplace?: boolean;
}): JSX.Element {
  const available = useContext(BatteryPurchasesContext);
  let href = "/marketplace#your-listings";
  let label: string = MARKETPLACE_COPY.earnGold;
  if (available === true && marketplace !== true) {
    href = "/account#buy-batteries";
    label = BATTERY_PURCHASES_COPY.heading;
  }
  return (
    <>
      {" "}
      <Link className="text-link" href={href}>
        {label}
      </Link>
    </>
  );
}

export { BatteryPurchasesAvailable, EarnGoldLink };
