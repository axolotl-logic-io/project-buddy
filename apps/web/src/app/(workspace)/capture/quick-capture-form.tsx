"use client";

import {
  type ChangeEvent,
  type JSX,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import { dayOf } from "@/notes/note.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";
import { type QuickCaptureState, saveNoteAction } from "./actions.ts";

const IDLE: QuickCaptureState = { kind: "idle" };

// A project the note can go to.
interface NoteProject {
  readonly id: ProjectId;
  readonly name: string;
}

// The status line's news.
function statusOf(state: QuickCaptureState, pending: boolean): string {
  if (pending) {
    return QUICK_CAPTURE_COPY.saving;
  }
  if (state.kind === "saved") {
    return QUICK_CAPTURE_COPY.saved(state.projectName);
  }
  return "";
}

// The quick-capture form: a project and the note's text. The note is dated
// with the browser's own day. A saved note clears the text, ready for the
// next one, and keeps the project; a refused or failed one keeps both, so
// nothing typed is lost. After each save, focus returns to the text.
export function QuickCaptureForm({
  projects,
  projectId,
}: {
  readonly projects: readonly NoteProject[];
  readonly projectId: ProjectId;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(saveNoteAction, IDLE);
  const [shownState, setShownState] = useState(state);
  const [chosen, setChosen] = useState<string>(projectId);
  const [draft, setDraft] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  if (state !== shownState) {
    setShownState(state);
    if (state.kind === "saved") {
      setDraft("");
    }
  }
  useEffect(() => {
    if (shownState.kind !== "idle") {
      textRef.current?.focus();
    }
  }, [shownState]);

  const choose = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setChosen(event.target.value);
  }, []);
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );
  const submit = useCallback(
    (formData: FormData): void => {
      formData.set("day", dayOf(new Date(), "local"));
      formAction(formData);
    },
    [formAction],
  );

  let textError: string | undefined;
  if (state.kind === "invalid") {
    textError = state.message;
  }

  return (
    <form action={submit} className="panel flex flex-col gap-4">
      <SelectField
        label={QUICK_CAPTURE_COPY.projectLabel}
        name="projectId"
        onChange={choose}
        value={chosen}
      >
        {projects.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        className="min-h-24"
        error={textError}
        hint={QUICK_CAPTURE_COPY.textHint}
        label={QUICK_CAPTURE_COPY.textLabel}
        name="text"
        onChange={updateDraft}
        ref={textRef}
        value={draft}
      />
      {state.kind === "failed" && <Alert>{state.message}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {QUICK_CAPTURE_COPY.save}
        </Button>
        <FormStatus>{statusOf(state, pending)}</FormStatus>
      </div>
    </form>
  );
}
