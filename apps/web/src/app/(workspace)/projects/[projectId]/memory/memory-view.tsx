"use client";

import {
  type ChangeEvent,
  type JSX,
  type ReactNode,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { keepLocalDraft, useKeptDraft } from "@/components/local-draft.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId, UserId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { type MemoryFormState, saveMemoryAction } from "./actions.ts";

const IDLE: MemoryFormState = { kind: "idle" };

// The viewer's unsaved text, as this browser keeps it (local-draft.ts).
const MEMORY_DRAFT = z.string();

// Whether the memory is shown formatted or open in her editor.
type Mode = "reading" | "editing";

// The project's current memory, shown formatted (children) with an Edit
// button. Edit puts her editor in its place, holding the memory's text; Save
// keeps her text and shows the memory formatted again, and Cancel drops her
// changes and shows it as it was. Focus moves to the editor when it opens,
// and back to the Edit button when it closes.
//
// A save is based on the version the editor last showed, so a newer one
// refuses it: the editor stays open with her text, and the newer version is
// shown formatted above it. Unsaved text is never thrown away by the page:
// when it brings a newer version, an editor whose text is unchanged shows
// it, and one with her changes keeps them, now based on the newer version.
// Her changes are also kept in this browser, for viewer and the project,
// until she saves or cancels: if she leaves the page with them, the editor
// opens with them when she comes back, based on the memory then, and says
// they are back.
export function MemoryView({
  projectId,
  viewer,
  memory,
  children,
}: {
  readonly projectId: ProjectId;
  readonly viewer: UserId;
  readonly memory: Memory;
  readonly children: ReactNode;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(saveMemoryAction, IDLE);
  const [answered, setAnswered] = useState(state);
  const [mode, setMode] = useState<Mode>("reading");
  // Whether she has opened or closed the editor, so focus follows the mode.
  const [switched, setSwitched] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [outdated, setOutdated] = useState<boolean>(false);
  const [shown, setShown] = useState(memory);
  const [draft, setDraft] = useState(memory.text);
  const [restored, setRestored] = useState<boolean>(false);
  const draftKey = `memory:${viewer}:${projectId}`;
  const editRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const headingId = useId();

  // Her text kept from an earlier visit, once the browser's storage can be
  // read, opens the editor unless it is the memory as it is.
  const { read, kept } = useKeptDraft(draftKey, MEMORY_DRAFT);
  const [lookedForKept, setLookedForKept] = useState<boolean>(false);
  if (read && !lookedForKept) {
    setLookedForKept(true);
    if (kept !== undefined && kept !== memory.text) {
      setShown(memory);
      setDraft(kept);
      setMode("editing");
      setRestored(true);
    }
  }
  if (state !== answered) {
    setAnswered(state);
    if (state.kind === "saved") {
      setMode("reading");
      setSaved(true);
    }
    setOutdated(state.kind === "outdated");
  }
  if (memory.version !== shown.version) {
    setShown(memory);
    if (draft === shown.text) {
      setDraft(memory.text);
    }
  }

  useEffect(() => {
    if (state.kind === "saved") {
      keepLocalDraft(draftKey, undefined);
    }
  }, [draftKey, state]);

  useEffect(() => {
    if (!switched) {
      return;
    }
    if (mode === "editing") {
      textRef.current?.focus();
    } else {
      editRef.current?.focus();
    }
  }, [mode, switched]);

  const startEditing = useCallback((): void => {
    setShown(memory);
    setDraft(memory.text);
    setSaved(false);
    setOutdated(false);
    setRestored(false);
    setMode("editing");
    setSwitched(true);
  }, [memory]);
  const cancel = useCallback((): void => {
    keepLocalDraft(draftKey, undefined);
    setOutdated(false);
    setRestored(false);
    setMode("reading");
    setSwitched(true);
  }, [draftKey]);
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      const { value } = event.target;
      setDraft(value);
      if (value === shown.text) {
        keepLocalDraft(draftKey, undefined);
        return;
      }
      keepLocalDraft(draftKey, value);
    },
    [draftKey, shown.text],
  );

  let error: string | undefined;
  if (outdated) {
    error = MEMORY_COPY.outdated;
  }
  let status = "";
  if (saved) {
    status = MEMORY_COPY.saved;
  }
  if (restored && mode === "editing") {
    status = MEMORY_COPY.restored;
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-heading" id={headingId}>
          {MEMORY_COPY.currentLabel}
        </h2>
        {mode === "reading" && (
          <Button onClick={startEditing} ref={editRef} variant="secondary">
            {MEMORY_COPY.edit}
          </Button>
        )}
      </div>
      {mode === "reading" && <div className="panel">{children}</div>}
      {mode === "editing" && outdated && (
        <section aria-label={MEMORY_COPY.newerLabel} className="panel">
          {children}
        </section>
      )}
      {mode === "editing" && (
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
            ref={textRef}
            value={draft}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending} type="submit">
              {MEMORY_COPY.save}
            </Button>
            <Button disabled={pending} onClick={cancel} variant="secondary">
              {MEMORY_COPY.cancelEdit}
            </Button>
          </div>
        </form>
      )}
      <FormStatus>{status}</FormStatus>
    </section>
  );
}
