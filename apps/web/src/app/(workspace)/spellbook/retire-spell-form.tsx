import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { retireSpellAction } from "./actions.ts";

// Retirement preserves the definition; permanent deletion lives in Retirement.
export function RetireSpellForm({
  spellId,
  name,
}: {
  readonly spellId: string;
  readonly name: string;
}): JSX.Element {
  return (
    <form action={retireSpellAction}>
      <input name="spellId" type="hidden" value={spellId} />
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
