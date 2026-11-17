"use client";

import {
  type ChangeEvent,
  type JSX,
  type SyntheticEvent,
  useCallback,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import { checkNoteText, type Note } from "@/notes/note.ts";
import { saveNoteAction } from "@/notes/note-actions.ts";
import { QUEST_NOTES_COPY, QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";

// The bucket's always-visible composer. Only Save persists a draft; a
// refusal leaves it intact. The server supplies the dated, ordered notes.
function QuestNoteComposer({
  questId,
  disabled,
  unavailable,
  onSaved,
  onPending,
}: {
  readonly questId: QuestId;
  readonly disabled: boolean;
  readonly unavailable: string | undefined;
  readonly onSaved: (notes: readonly Note[]) => void;
  readonly onPending: (pending: boolean) => void;
}): JSX.Element {
  const fieldId = useId();
  const hintId = useId();
  const problemId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const savingRef = useRef<boolean>(false);
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | undefined>();
  let describedBy = hintId;
  if (problem !== undefined) {
    describedBy = `${hintId} ${problemId}`;
  }
  const [failure, setFailure] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const blocked = disabled || pending || unavailable !== undefined;
  const change = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setText(event.currentTarget.value);
      setProblem(undefined);
    },
    [],
  );
  const clear = useCallback((): void => {
    if (savingRef.current) {
      return;
    }
    setText("");
    setProblem(undefined);
    setFailure(undefined);
    setStatus(undefined);
    inputRef.current?.focus();
  }, []);
  const save = useCallback(
    (event: SyntheticEvent<HTMLFormElement>): void => {
      event.preventDefault();
      if (blocked || savingRef.current) {
        return;
      }
      setFailure(undefined);
      setStatus(undefined);
      const checked = checkNoteText(text);
      if ("problem" in checked) {
        setProblem(QUICK_NOTE_COPY.problem(checked.problem));
        inputRef.current?.focus();
        return;
      }
      setProblem(undefined);
      savingRef.current = true;
      onPending(true);
      startTransition(async (): Promise<void> => {
        try {
          const result = await saveNoteAction({ questId, text: checked.text });
          if (result.kind === "problem") {
            let explanation = result.text;
            if (explanation === QUICK_NOTE_COPY.notFound) {
              explanation = QUEST_NOTES_COPY.unavailable;
            }
            setFailure(explanation);
            return;
          }
          onSaved(result.notes);
          setText("");
          setStatus(QUEST_NOTES_COPY.saved);
        } catch {
          setFailure(QUICK_NOTE_COPY.failed);
        } finally {
          savingRef.current = false;
          onPending(false);
          inputRef.current?.focus();
        }
      });
    },
    [blocked, onPending, onSaved, questId, text],
  );
  let saveLabel: string = QUICK_NOTE_COPY.save;
  if (pending) {
    saveLabel = QUICK_NOTE_COPY.saving;
  }
  return (
    <form
      className="quest-note-composer"
      aria-label={QUEST_NOTES_COPY.composer}
      noValidate={true}
      onSubmit={save}
      aria-busy={pending}
    >
      <label className="field-label" htmlFor={fieldId}>
        {QUICK_NOTE_COPY.textLabel}
      </label>
      <textarea
        ref={inputRef}
        id={fieldId}
        className="input-field"
        aria-describedby={describedBy}
        aria-invalid={problem !== undefined}
        placeholder={QUEST_NOTES_COPY.placeholder}
        name="text"
        rows={4}
        value={text}
        onChange={change}
        readOnly={pending}
      />
      <div className="quest-note-hint text-muted text-xs">
        <p id={hintId}>{QUEST_NOTES_COPY.textHint}</p>
        <p>{QUEST_NOTES_COPY.count(text.trim().length)}</p>
      </div>
      {problem !== undefined && <Alert id={problemId}>{problem}</Alert>}
      {unavailable !== undefined && <p className="text-muted">{unavailable}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" aria-busy={pending} disabled={blocked}>
          {saveLabel}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={clear}>
          {QUEST_NOTES_COPY.clear}
        </Button>
      </div>
      {failure !== undefined && <Alert>{failure}</Alert>}
      <FormStatus>{status}</FormStatus>
    </form>
  );
}

export { QuestNoteComposer };
