"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useId,
  useState,
} from "react";
import type { ProjectId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { COPY } from "@/ui/copy.ts";
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
  const textId = useId();
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

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="projectId" type="hidden" value={projectId} />
      <input name="basedOn" type="hidden" value={shown.version} />
      <label className="font-medium text-sm" htmlFor={textId}>
        {COPY.memory.textLabel}
      </label>
      <textarea
        className="input-field min-h-48 font-mono text-sm"
        id={textId}
        name="text"
        onChange={updateDraft}
        value={draft}
      />
      {state.kind === "outdated" && (
        <p className="error-text" role="alert">
          {COPY.memory.outdated}
        </p>
      )}
      {state.kind === "saved" && (
        <p className="text-muted text-sm" role="status">
          {COPY.memory.saved}
        </p>
      )}
      <button
        className="button-primary self-start"
        disabled={pending}
        type="submit"
      >
        {COPY.memory.save}
      </button>
    </form>
  );
}
