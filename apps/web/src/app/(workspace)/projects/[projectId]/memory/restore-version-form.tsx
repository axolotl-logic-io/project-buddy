"use client";

import {
  type JSX,
  useActionState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import type { MemoryVersionNumber } from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasPendingRef = useRef<boolean>(false);
  useEffect((): void => {
    if (wasPendingRef.current && !pending) {
      triggerRef.current?.focus();
    }
    wasPendingRef.current = pending;
  }, [pending]);
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
        cancelLabel={MEMORY_COPY.restoreCancel}
        confirmLabel={MEMORY_COPY.restore(version)}
        description={MEMORY_COPY.restoreDescription(version)}
        onConfirm={restore}
        title={MEMORY_COPY.restoreTitle(version)}
        trigger={
          <Button
            className="self-start"
            disabled={pending}
            ref={triggerRef}
            variant="quiet"
          >
            {MEMORY_COPY.restore(version)}
          </Button>
        }
      />
      {state.kind === "saved" && (
        <FormStatus>{MEMORY_COPY.restored(version)}</FormStatus>
      )}
      {state.kind === "outdated" && (
        <Alert>{MEMORY_COPY.restoreOutdated}</Alert>
      )}
    </form>
  );
}
