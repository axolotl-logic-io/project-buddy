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
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { MilestoneId } from "@/ids.ts";
import { MILESTONE_TEXT_MAX_LENGTH } from "@/milestones/milestone.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import {
  deleteMilestoneAction,
  type EditMilestoneState,
  editMilestoneAction,
} from "./actions.ts";

const IDLE: EditMilestoneState = { kind: "idle" };

// The editor keeps refused text on screen. Cancel discards the draft.
function MilestoneEditor({
  milestoneId,
  text,
  onClose,
}: {
  readonly milestoneId: MilestoneId;
  readonly text: string;
  readonly onClose: () => void;
}): JSX.Element {
  const errorId = useId();
  const [draft, setDraft] = useState(text);
  const save = useCallback(
    async (
      previous: EditMilestoneState,
      form: FormData,
    ): Promise<EditMilestoneState> => {
      const result = await editMilestoneAction(previous, form);
      if (result.kind === "saved") {
        onClose();
      }
      return result;
    },
    [onClose],
  );
  const [state, formAction, pending] = useActionState(save, IDLE);
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );
  const focusInput = useCallback((input: HTMLInputElement | null): void => {
    input?.focus();
  }, []);
  let error: string | undefined;
  if (state.kind === "invalid") {
    error = state.message;
  }
  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate={true}>
      <input name="milestoneId" type="hidden" value={milestoneId} />
      <input
        aria-describedby={errorId}
        aria-invalid={state.kind === "invalid"}
        aria-label={PROGRESS_TIMELINE_COPY.textLabel}
        className="input-field min-h-(--target-size)"
        maxLength={MILESTONE_TEXT_MAX_LENGTH}
        name="text"
        onChange={updateDraft}
        ref={focusInput}
        type="text"
        value={draft}
      />
      {error !== undefined && <Alert id={errorId}>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} type="submit">
          {PROGRESS_TIMELINE_COPY.save}
        </Button>
        <Button disabled={pending} onClick={onClose} variant="secondary">
          {PROGRESS_TIMELINE_COPY.cancel}
        </Button>
      </div>
    </form>
  );
}

// Deletes the milestone once she confirms.
function DeleteMilestoneForm({
  milestoneId,
  text,
}: {
  readonly milestoneId: MilestoneId;
  readonly text: string;
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={deleteMilestoneAction} ref={formRef}>
      <input name="milestoneId" type="hidden" value={milestoneId} />
      <ConfirmDialog
        cancelLabel={PROGRESS_TIMELINE_COPY.deleteCancel}
        confirmLabel={PROGRESS_TIMELINE_COPY.deleteConfirm}
        description={PROGRESS_TIMELINE_COPY.deleteDescription(text)}
        onConfirm={confirm}
        title={PROGRESS_TIMELINE_COPY.deleteTitle}
        trigger={
          <Button
            aria-label={PROGRESS_TIMELINE_COPY.deleteLabel(text)}
            variant="quiet"
          >
            <Icon name="trash" />
            {PROGRESS_TIMELINE_COPY.delete}
          </Button>
        }
      />
    </form>
  );
}

// A milestone's text, with its chat link and the buttons that edit or
// delete it, or, while she edits it, the form that changes its text. When
// the form closes, keyboard focus goes back to the Edit button.
export function MilestoneControls({
  milestoneId,
  text,
  chatLink,
}: {
  readonly milestoneId: MilestoneId;
  readonly text: string;
  readonly chatLink: ReactNode;
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
    return (
      <MilestoneEditor milestoneId={milestoneId} onClose={close} text={text} />
    );
  }
  return (
    <>
      <p className="font-medium">{text}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {chatLink}
        <Button
          aria-label={PROGRESS_TIMELINE_COPY.editLabel(text)}
          onClick={open}
          ref={editRef}
          variant="quiet"
        >
          <Icon name="pencil" />
          {PROGRESS_TIMELINE_COPY.edit}
        </Button>
        <DeleteMilestoneForm milestoneId={milestoneId} text={text} />
      </div>
    </>
  );
}
