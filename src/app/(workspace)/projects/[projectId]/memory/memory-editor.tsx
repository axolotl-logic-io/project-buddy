"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { type MemoryFormState, saveMemoryAction } from "./actions.ts";

const IDLE: MemoryFormState = { kind: "idle" };

// Her editor for the project's memory. A save is based on the version the
// editor last showed, so a newer one refuses it. Unsaved text is never
// thrown away: when the page brings a newer version, an editor whose text is
// unchanged shows it, and one with her changes keeps them, now based on the
// newer version.
export function MemoryEditor({
  projectId,
  memory,
}: {
  projectId: ProjectId;
  memory: Memory;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(saveMemoryAction, IDLE);
  const [shown, setShown] = useState(memory);
  const [draft, setDraft] = useState(memory.text);
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );

  if (memory.version !== shown.version) {
    setShown(memory);
    if (draft === shown.text) {
      setDraft(memory.text);
    }
  }

  let error: string | undefined;
  if (state.kind === "outdated") {
    error = MEMORY_COPY.outdated;
  }
  let status = "";
  if (state.kind === "saved") {
    status = MEMORY_COPY.saved;
  }

  return (
    <form action={formAction} className="panel flex flex-col gap-4">
      <input name="projectId" type="hidden" value={projectId} />
      <input name="basedOn" type="hidden" value={shown.version} />
      <TextAreaField
        className="min-h-56 font-mono text-sm"
        error={error}
        hint={MEMORY_COPY.textHint}
        label={MEMORY_COPY.textLabel}
        name="text"
        onChange={updateDraft}
        value={draft}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {MEMORY_COPY.save}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}
