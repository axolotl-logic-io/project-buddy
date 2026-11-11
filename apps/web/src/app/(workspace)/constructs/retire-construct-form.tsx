import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { retireConstructAction } from "./actions.ts";

// Retirement preserves the definition; permanent deletion lives in Retirement.
export function RetireConstructForm({
  constructId,
  name,
}: {
  readonly constructId: string;
  readonly name: string;
}): JSX.Element {
  return (
    <form action={retireConstructAction}>
      <input name="constructId" type="hidden" value={constructId} />
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
