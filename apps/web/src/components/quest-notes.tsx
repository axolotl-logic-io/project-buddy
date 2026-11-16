"use client";

import { type JSX, useCallback, useRef, useState } from "react";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { usePanelSend } from "@/components/chat/chat-send.ts";
import { LocalTime } from "@/components/local-time.tsx";
import {
  EditableList,
  EditableListAction,
  EditableListRow,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import {
  checkNoteText,
  NOTE_MAX_LENGTH,
  type Note,
  type NoteId,
} from "@/notes/note.ts";
import { QUEST_NOTES_COPY, QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";

function validateNote(text: string): { text: string } | { problem: string } {
  const checked = checkNoteText(text);
  if ("problem" in checked) {
    return { problem: QUICK_NOTE_COPY.problem(checked.problem) };
  }
  return checked;
}
const NOTE_EDITOR: EditorOptions = {
  label: QUICK_NOTE_COPY.textLabel,
  save: QUEST_NOTES_COPY.save,
  cancel: QUEST_NOTES_COPY.cancel,
  placeholder: QUICK_NOTE_COPY.textLabel,
  maxLength: NOTE_MAX_LENGTH,
  multiline: true,
  validate: validateNote,
};

function NoteRow({
  note,
  busy,
  onDelete,
  onEdit,
}: {
  readonly note: Note;
  readonly busy: boolean;
  readonly onDelete: (id: NoteId) => Promise<void>;
  readonly onEdit: (id: NoteId, text: string) => Promise<boolean>;
}): JSX.Element {
  const remove = useCallback(
    (): Promise<void> => onDelete(note.id),
    [note.id, onDelete],
  );
  const save = useCallback(
    (text: string): Promise<boolean> => onEdit(note.id, text),
    [note.id, onEdit],
  );
  return (
    <EditableListRow
      id={note.id}
      text={note.text}
      editor={NOTE_EDITOR}
      editLabel={QUEST_NOTES_COPY.edit}
      actionsLabel={QUEST_NOTES_COPY.actions(note.text)}
      disabled={busy}
      onSave={save}
      badge={
        <span className="text-muted">
          <LocalTime dateTime={note.savedAt} detail="day" />
        </span>
      }
    >
      <EditableListAction
        icon="trash"
        onSelect={remove}
        label={QUEST_NOTES_COPY.deleteLabel(note.text)}
      >
        {QUEST_NOTES_COPY.delete}
      </EditableListAction>
    </EditableListRow>
  );
}

// A quest's Quick Notes, newest first, edited and deleted through commands.
// A deleted note's button goes with it, so focus moves to the list's heading, and the status line says
// what the conversation noted.
function QuestNotes({
  notes: savedNotes,
}: {
  readonly notes: readonly Note[];
}): JSX.Element {
  const [notes, setNotes] = useState(savedNotes);
  const { send, busy, status, problem } = usePanelSend();
  const headingRef = useRef<HTMLParagraphElement>(null);
  // A route refresh can add a note saved from the site panel.
  const [previous, setPrevious] = useState(savedNotes);
  if (previous !== savedNotes) {
    setPrevious(savedNotes);
    setNotes(savedNotes);
  }
  const remove = useCallback(
    async (id: NoteId): Promise<void> => {
      const index = notes.findIndex((note) => note.id === id);
      if (index < 0) {
        return;
      }
      const result = await send(PANEL_COMMAND.dropNote(index + 1));
      if (result.sent) {
        setNotes((current) => current.filter((note) => note.id !== id));
        headingRef.current?.focus();
      }
    },
    [notes, send],
  );
  const edit = useCallback(
    async (id: NoteId, text: string): Promise<boolean> => {
      const index = notes.findIndex((note) => note.id === id);
      if (index < 0) {
        return false;
      }
      const result = await send(PANEL_COMMAND.editNote(index + 1, text));
      if (result.sent) {
        setNotes((current) =>
          current.map((note) => {
            if (note.id === id) {
              return { ...note, text };
            }
            return note;
          }),
        );
      }
      return result.sent;
    },
    [notes, send],
  );
  return (
    <section className="page-slot">
      <p className="sr-only" ref={headingRef} tabIndex={-1}>
        {QUEST_NOTES_COPY.heading}
      </p>
      <FormStatus>{status}</FormStatus>
      {problem !== undefined && <Alert>{problem}</Alert>}
      {notes.length === 0 && (
        <p className="text-muted">{QUEST_NOTES_COPY.none}</p>
      )}
      {notes.length > 0 && (
        <EditableList label={QUEST_NOTES_COPY.heading}>
          {notes.map((note) => (
            <NoteRow
              busy={busy}
              key={note.id}
              note={note}
              onDelete={remove}
              onEdit={edit}
            />
          ))}
        </EditableList>
      )}
    </section>
  );
}

export { QuestNotes };
