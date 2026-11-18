"use client";

import {
  type ChangeEvent,
  type JSX,
  type SubmitEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { MilestoneId } from "@/ids.ts";
import { MILESTONE_TEXT_MAX_LENGTH } from "@/milestones/milestone.ts";
import { changeMilestoneAction } from "@/milestones/milestone-actions.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";

// The editor keeps refused text on screen.
function MilestoneEditor({
  id,
  text,
  onClose,
}: {
  readonly id: MilestoneId;
  readonly text: string;
  readonly onClose: () => void;
}): JSX.Element {
  const errorId = useId();
  const [draft, setDraft] = useState(text);
  const { run, busy, problem } = useQuestAction(changeMilestoneAction);
  const save = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      run({ id, text: draft })
        .then((saved) => {
          if (saved) {
            onClose();
          }
        })
        .catch(() => undefined);
    },
    [run, id, draft, onClose],
  );
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );
  const focusInput = useCallback((input: HTMLInputElement | null): void => {
    input?.focus();
  }, []);
  return (
    <form className="flex flex-col gap-2" noValidate={true} onSubmit={save}>
      <input
        aria-describedby={errorId}
        aria-invalid={problem !== undefined}
        aria-label={PROGRESS_TIMELINE_COPY.textLabel}
        className="input-field min-h-(--target-size)"
        maxLength={MILESTONE_TEXT_MAX_LENGTH}
        name="text"
        onChange={updateDraft}
        ref={focusInput}
        type="text"
        value={draft}
      />
      {problem !== undefined && <Alert id={errorId}>{problem}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button aria-busy={busy} disabled={busy} type="submit">
          {PROGRESS_TIMELINE_COPY.save}
        </Button>
        <Button disabled={busy} onClick={onClose} variant="secondary">
          {PROGRESS_TIMELINE_COPY.cancel}
        </Button>
      </div>
    </form>
  );
}

function DeleteMilestone({
  id,
  text,
}: {
  readonly id: MilestoneId;
  readonly text: string;
}): JSX.Element {
  const { run, busy, problem } = useQuestAction(changeMilestoneAction);
  const confirm = useCallback((): void => {
    run({ id }).catch(() => undefined);
  }, [run, id]);
  return (
    <>
      <ConfirmDialog
        cancelLabel={PROGRESS_TIMELINE_COPY.deleteCancel}
        confirmLabel={PROGRESS_TIMELINE_COPY.deleteConfirm}
        description={PROGRESS_TIMELINE_COPY.deleteDescription(text)}
        onConfirm={confirm}
        title={PROGRESS_TIMELINE_COPY.deleteTitle}
        variant="danger"
        trigger={
          <Button
            aria-label={PROGRESS_TIMELINE_COPY.deleteLabel(text)}
            disabled={busy}
            variant="quiet"
          >
            <Icon name="trash" />
            {PROGRESS_TIMELINE_COPY.delete}
          </Button>
        }
      />
      {problem !== undefined && <Alert>{problem}</Alert>}
    </>
  );
}

// A milestone's text, with the buttons that edit or
// delete it, or, while she edits it, the form that changes its text. When
// the form closes, keyboard focus goes back to the Edit button.
export function MilestoneControls({
  id,
  text,
}: {
  readonly id: MilestoneId;
  readonly text: string;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  useEffect(() => {
    if (editing === false && restoreFocusRef.current === true) {
      editRef.current?.focus();
      restoreFocusRef.current = false;
    }
  }, [editing]);
  const open = useCallback((): void => {
    setEditing(true);
  }, []);
  const close = useCallback((): void => {
    restoreFocusRef.current = true;
    setEditing(false);
  }, []);
  if (editing === true) {
    return <MilestoneEditor onClose={close} id={id} text={text} />;
  }
  return (
    <>
      <p className="wrap-anywhere font-medium">{text}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <Button
          aria-label={PROGRESS_TIMELINE_COPY.editLabel(text)}
          onClick={open}
          ref={editRef}
          variant="quiet"
        >
          <Icon name="pencil" />
          {PROGRESS_TIMELINE_COPY.edit}
        </Button>
        <DeleteMilestone id={id} text={text} />
      </div>
    </>
  );
}
