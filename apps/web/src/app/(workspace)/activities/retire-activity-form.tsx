import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import type { SaleState } from "@/marketplace/listing-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { retireActivityAction } from "./actions.ts";

// Retirement preserves the definition; permanent deletion lives in Retirement.
export function RetireActivityForm({
  activityId,
  name,
}: {
  readonly activityId: string;
  readonly name: string;
  readonly sale?: SaleState["kind"];
}): JSX.Element {
  return (
    <form action={retireActivityAction}>
      <input name="activityId" type="hidden" value={activityId} />
      <Button
        aria-label={RETIREMENT_COPY.retireLabel(name)}
        type="submit"
        variant="quiet"
      >
        {RETIREMENT_COPY.retire}
      </Button>
    </form>
  );
}
