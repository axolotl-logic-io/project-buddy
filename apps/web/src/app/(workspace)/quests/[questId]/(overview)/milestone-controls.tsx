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
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { usePanelSend } from "@/components/chat/chat-send.ts";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { MILESTONE_TEXT_MAX_LENGTH } from "@/milestones/milestone.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";

// The editor keeps refused text on screen. Cancel discards the draft. Save
// sends /edit-milestone to the quest's conversation.
function MilestoneEditor({
  place,
  text,
  onClose,
}: {
  readonly place: number;
  readonly text: string;
  readonly onClose: () => void;
}): JSX.Element {
  const errorId = useId();
  const [draft, setDraft] = useState(text);
  const { send, busy, problem } = usePanelSend();
  const save = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      send(PANEL_COMMAND.editMilestone(place, draft))
        .then((result) => {
          if (result.sent) {
            onClose();
          }
        })
        .catch(() => undefined);
    },
    [send, place, draft, onClose],
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

// Sends /drop-milestone once she confirms.
function DeleteMilestone({
  place,
  text,
}: {
  readonly place: number;
  readonly text: string;
}): JSX.Element {
  const { send, problem } = usePanelSend();
  const confirm = useCallback((): void => {
    send(PANEL_COMMAND.dropMilestone(place)).catch(() => undefined);
  }, [send, place]);
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
// place is the milestone's place in Progress, newest first, as the
// commands name it.
export function MilestoneControls({
  place,
  text,
}: {
  readonly place: number;
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
    return <MilestoneEditor onClose={close} place={place} text={text} />;
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
        <DeleteMilestone place={place} text={text} />
      </div>
    </>
  );
}
