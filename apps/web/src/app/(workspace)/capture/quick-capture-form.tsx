"use client";

import {
  type ChangeEvent,
  type JSX,
  type SubmitEvent,
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { keepLocalDraft, readLocalDraft } from "@/components/local-draft.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId, UserId } from "@/ids.ts";
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

// The text and project an answer sent back, to show again, or undefined.
function sentBack(
  state: QuickCaptureState,
): { readonly text: string; readonly projectId: string } | undefined {
  if (state.kind === "invalid" || state.kind === "failed") {
    return state;
  }
  return undefined;
}

// The quick-capture form: a project and the note's text. The note is dated
// with the browser's own day. A saved note clears the text, ready for the
// next one, and keeps the project; a refused or failed one keeps both, so
// nothing typed is lost. After each save, focus returns to the text.
// Before the page's script runs, the form posts to the same Server Action,
// and the page comes back with the answer, the text and the project in it.
export function QuickCaptureForm({
  projects,
  viewer,
  projectId,
}: {
  readonly viewer: UserId;
  readonly projects: readonly NoteProject[];
  readonly projectId: ProjectId;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(saveNoteAction, IDLE);
  const [shownState, setShownState] = useState(state);
  const [chosen, setChosen] = useState<string>(
    sentBack(state)?.projectId ?? projectId,
  );
  const [draft, setDraft] = useState(sentBack(state)?.text ?? "");
  const key = `quick-note:${viewer}`;
  const draftKey = useCallback((id: string): string => `${key}:${id}`, [key]);
  useEffect(() => {
    const selected = readLocalDraft(key, z.string());
    let id: string = projectId;
    if (
      selected !== undefined &&
      projects.some((project) => project.id === selected)
    ) {
      id = selected;
    }
    queueMicrotask(() => {
      setChosen(id);
      setDraft(readLocalDraft(draftKey(id), z.string()) ?? "");
    });
  }, [key, projectId, projects, draftKey]);
  const textRef = useRef<HTMLTextAreaElement>(null);

  if (state !== shownState) {
    setShownState(state);
    if (state.kind === "saved") {
      keepLocalDraft(draftKey(chosen), undefined);
      setDraft("");
    }
  }
  useEffect(() => {
    if (shownState.kind !== "idle") {
      textRef.current?.focus();
    }
  }, [shownState]);

  const discard = useCallback((): void => {
    keepLocalDraft(draftKey(chosen), undefined);
    setDraft("");
    textRef.current?.focus();
  }, [draftKey, chosen]);
  const choose = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const id = event.target.value;
      setChosen(id);
      keepLocalDraft(key, id);
      setDraft(readLocalDraft(draftKey(id), z.string()) ?? "");
    },
    [key, draftKey],
  );
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setDraft(event.target.value);
      keepLocalDraft(draftKey(chosen), event.target.value || undefined);
    },
    [chosen, draftKey],
  );
  // Once the script runs, the form is sent from here, which stops the
  // browser's own submission and so React's running of the form's action:
  // React resets a form after its action, which would put the project
  // choice back. The form's action is the path before the script runs.
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      formData.set("day", dayOf(new Date(), "local"));
      startTransition(() => {
        formAction(formData);
      });
    },
    [formAction],
  );

  let textError: string | undefined;
  if (state.kind === "invalid") {
    textError = state.message;
  }

  return (
    <form
      action={formAction}
      className="panel flex flex-col gap-4"
      onSubmit={submit}
    >
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
      <p className="text-muted">{QUICK_CAPTURE_COPY.draftHint}</p>
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
        <Button disabled={pending} variant="secondary" onClick={discard}>
          {QUICK_CAPTURE_COPY.discard}
        </Button>
        <FormStatus>{statusOf(state, pending)}</FormStatus>
      </div>
    </form>
  );
}
