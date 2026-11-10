"use client";

import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import type { RetiredDefinition } from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import {
  deleteRetiredDefinitionAction,
  restoreDefinitionAction,
} from "./actions.ts";

// Restore and Delete forever for a retired definition. restore is the
// Restore button's variant: quiet in a list's row, secondary on its page.
function RetirementActions({
  definition,
  restore = "secondary",
}: {
  readonly definition: RetiredDefinition;
  readonly restore?: "secondary" | "quiet";
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  let description = `${RETIREMENT_COPY.deleteDescription(definition.kind)} ${RETIREMENT_COPY.marketplace}`;
  if (definition.boughtFrom !== null) {
    description += ` ${RETIREMENT_COPY.bought}`;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <form action={restoreDefinitionAction}>
        <input name="promptId" type="hidden" value={definition.id} />
        <Button
          aria-label={RETIREMENT_COPY.restoreLabel(definition.name)}
          type="submit"
          variant={restore}
        >
          {RETIREMENT_COPY.restore}
        </Button>
      </form>
      <form action={deleteRetiredDefinitionAction} ref={formRef}>
        <input name="promptId" type="hidden" value={definition.id} />
        <ConfirmDialog
          cancelLabel={RETIREMENT_COPY.keep}
          confirmLabel={RETIREMENT_COPY.delete}
          description={description}
          onConfirm={confirm}
          title={RETIREMENT_COPY.deleteTitle(definition.name)}
          trigger={
            <Button
              aria-label={RETIREMENT_COPY.deleteLabel(definition.name)}
              className="text-danger"
              variant="quiet"
            >
              {RETIREMENT_COPY.delete}
            </Button>
          }
        />
      </form>
    </div>
  );
}

export { RetirementActions };
