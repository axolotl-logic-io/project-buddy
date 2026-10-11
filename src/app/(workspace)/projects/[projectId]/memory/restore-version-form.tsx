"use client";

import { type JSX, useActionState } from "react";
import type { ProjectId } from "@/ids.ts";
import type { MemoryVersionNumber } from "@/memory/memory.ts";
import { COPY } from "@/ui/copy.ts";
import { type MemoryFormState, restoreMemoryAction } from "./actions.ts";

const IDLE: MemoryFormState = { kind: "idle" };

// Restores an earlier version as the newest, based on the newest version the
// page showed, so a newer one refuses it.
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

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input name="projectId" type="hidden" value={projectId} />
      <input name="version" type="hidden" value={version} />
      <input name="basedOn" type="hidden" value={basedOn} />
      <button
        className="self-start text-link text-sm"
        disabled={pending}
        type="submit"
      >
        {COPY.memory.restore(version)}
      </button>
      {state.kind === "outdated" && (
        <p className="error-text" role="alert">
          {COPY.memory.restoreOutdated}
        </p>
      )}
    </form>
  );
}
