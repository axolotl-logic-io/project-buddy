import type { ListingId } from "@/ids.ts";
import type { SaleState } from "@/marketplace/listing-store.ts";

// The listing an own prompt is listed as now, from its sale state, or
// undefined if it isn't listed.
export function listedAs(sale: SaleState): ListingId | undefined {
  if (sale.kind === "listed") {
    return sale.listing;
  }
  return undefined;
}
