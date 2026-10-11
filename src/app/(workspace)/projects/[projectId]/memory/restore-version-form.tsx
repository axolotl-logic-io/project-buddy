"use client";

import { type JSX, useActionState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { FormAlert } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import type { MemoryVersionNumber } from "@/memory/memory.ts";
import { COPY } from "@/ui/copy.ts";
import { type MemoryFormState, restoreMemoryAction } from "./actions.ts";

const IDLE: MemoryFormState = { kind: "idle" };

// Restores an earlier version as the newest, once she confirms, based on the
// newest version the page showed, so a newer one refuses it.
export function RestoreVersionForm({
  projectId,
  version,
  basedOn,
}: {
  projectId: ProjectId;
  version: MemoryVersionNumber;
  basedOn: MemoryVersionNumber;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(
    restoreMemoryAction,
    IDLE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const restore = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form action={formAction} className="flex flex-col gap-1" ref={formRef}>
      <input name="projectId" type="hidden" value={projectId} />
      <input name="version" type="hidden" value={version} />
      <input name="basedOn" type="hidden" value={basedOn} />
      <ConfirmDialog
        cancelLabel={COPY.memory.restoreCancel}
        confirmLabel={COPY.memory.restore(version)}
        description={COPY.memory.restoreDescription(version)}
        onConfirm={restore}
        title={COPY.memory.restoreTitle(version)}
        trigger={
          <Button className="self-start" disabled={pending} variant="quiet">
            {COPY.memory.restore(version)}
          </Button>
        }
      />
      {state.kind === "outdated" && (
        <FormAlert>{COPY.memory.restoreOutdated}</FormAlert>
      )}
    </form>
  );
}
