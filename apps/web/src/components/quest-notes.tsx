"use client";

import { type JSX, useCallback, useRef, useState } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { QuestNoteComposer } from "@/components/quest-note-composer.tsx";
import {
  EditableList,
  EditableListAction,
  EditableListRow,
  EditableListScope,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import {
  checkNoteText,
  NOTE_MAX_LENGTH,
  type Note,
  type NoteId,
} from "@/notes/note.ts";
import { changeNoteAction } from "@/notes/note-actions.ts";
import type { Quest } from "@/quests/store.ts";
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
      leading={
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

function QuestNotes({
  notes: savedNotes,
  quest,
}: {
  readonly notes: readonly Note[];
  readonly quest: Pick<Quest, "id" | "status">;
}): JSX.Element {
  const [notes, setNotes] = useState(savedNotes);
  const { run, busy, status, problem } = useQuestAction(changeNoteAction);
  const [creating, setCreating] = useState(false);
  const receive = useCallback(
    (saved: readonly Note[]): void => setNotes(saved),
    [],
  );
  let creationProblem: string | undefined;
  if (quest.status !== "active") {
    creationProblem = QUEST_NOTES_COPY.inactive;
  }
  const headingRef = useRef<HTMLParagraphElement>(null);
  // A route refresh can add a note saved from the site panel.
  const [previous, setPrevious] = useState(savedNotes);
  if (previous !== savedNotes) {
    setPrevious(savedNotes);
    setNotes(savedNotes);
  }
  const remove = useCallback(
    async (id: NoteId): Promise<void> => {
      if (await run({ questId: quest.id, id })) {
        setNotes((current) => current.filter((note) => note.id !== id));
        headingRef.current?.focus();
      }
    },
    [quest.id, run],
  );
  const edit = useCallback(
    async (id: NoteId, text: string): Promise<boolean> => {
      const saved = await run({ questId: quest.id, id, text });
      if (saved) {
        setNotes((current) =>
          current.map((note) => {
            if (note.id === id) {
              return { ...note, text };
            }
            return note;
          }),
        );
      }
      return saved;
    },
    [quest.id, run],
  );
  return (
    <section className="page-slot bucket-desk bucket-notes">
      <p className="sr-only" ref={headingRef} tabIndex={-1}>
        {QUEST_NOTES_COPY.heading}
      </p>
      <QuestNoteComposer
        questId={quest.id}
        disabled={busy}
        unavailable={creationProblem}
        onSaved={receive}
        onPending={setCreating}
      />
      <FormStatus>{status}</FormStatus>
      {problem !== undefined && <Alert>{problem}</Alert>}
      <div className="bucket-toolbar">
        <p className="bucket-summary">
          {QUEST_NOTES_COPY.summary(notes.length)}
        </p>
      </div>
      {notes.length === 0 && (
        <div className="bucket-empty bucket-empty-copy">
          <Icon name="note" />
          <p className="bucket-empty-heading">
            {QUEST_NOTES_COPY.emptyHeading}
          </p>
          <p>{QUEST_NOTES_COPY.none}</p>
        </div>
      )}
      <EditableListScope blocked={busy || creating}>
        {notes.length > 0 && (
          <EditableList label={QUEST_NOTES_COPY.heading}>
            {notes.map((note) => (
              <NoteRow
                busy={busy || creating}
                key={note.id}
                note={note}
                onDelete={remove}
                onEdit={edit}
              />
            ))}
          </EditableList>
        )}
      </EditableListScope>
    </section>
  );
}

export { QuestNotes };
