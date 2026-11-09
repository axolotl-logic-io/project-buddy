import type { JSX } from "react";
import { availableBatteryCatalog } from "@/batteries/catalog.ts";
import { BatteryPurchasesAvailable } from "@/components/earn-gold-link.tsx";
import { RefreshPreferences } from "@/components/refresh-preferences.tsx";

// The workspace supplies flex space; segment frames choose content width.
// The root layout supplies the main landmark around it.
export default function WorkspaceLayout({
  children,
}: LayoutProps<"/">): JSX.Element {
  return (
    <div className="workspace-frame">
      <BatteryPurchasesAvailable
        available={availableBatteryCatalog().length > 0}
      >
        <RefreshPreferences />
        {children}
      </BatteryPurchasesAvailable>
    </div>
  );
}
