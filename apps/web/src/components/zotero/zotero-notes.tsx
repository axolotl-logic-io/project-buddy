"use client";

import {
  type ChangeEvent,
  type JSX,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import { NOTE_MAX } from "@/zotero/note-text.ts";
import type { ZoteroNoteId, ZoteroReferenceId } from "@/zotero/zotero.ts";
import { saveZoteroNoteAction } from "@/zotero/zotero-actions.ts";
import type { ZoteroReferenceNote } from "@/zotero/zotero-list-store.ts";

const COPY: typeof ZOTERO_COPY.notes = ZOTERO_COPY.notes;
const NOTE_ROWS = 3;

// Where a note is saved: its reference, and the note itself unless it is
// new.
interface NotePlace {
  readonly questId: QuestId;
  readonly listId: ListId;
  readonly referenceId: ZoteroReferenceId;
  readonly noteId: ZoteroNoteId | undefined;
}

// A note's text in a field, with Save note and Cancel. A saved note waits
// for the owner's next sync.
function NoteEditor({
  place,
  initial,
  label,
  onDone,
}: {
  readonly place: NotePlace;
  readonly initial: string;
  readonly label: string;
  readonly onDone: () => void;
}): JSX.Element {
  const hintId = useId();
  const [text, setText] = useState(initial);
  const [problem, setProblem] = useState<string | undefined>();
  const [saving, startSaving] = useTransition();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // The field opens because someone asked to write in it, from the Add or
  // Edit button that is now gone.
  useEffect(() => {
    fieldRef.current?.focus();
  }, []);
  const change = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      setText(event.target.value),
    [],
  );
  const save = useCallback((): void => {
    setProblem(undefined);
    startSaving(async () => {
      const result = await saveZoteroNoteAction(place, text);
      if (result.ok) {
        onDone();
      } else {
        setProblem(result.message);
      }
    });
  }, [onDone, place, text]);
  let saveLabel: string = COPY.save;
  if (saving) {
    saveLabel = COPY.saving;
  }
  return (
    <div className="zotero-note-editor">
      <textarea
        className="input-field zotero-note-field"
        aria-label={label}
        aria-describedby={hintId}
        maxLength={NOTE_MAX}
        rows={NOTE_ROWS}
        value={text}
        onChange={change}
        disabled={saving}
        ref={fieldRef}
      />
      <p className="zotero-hint" id={hintId}>
        {COPY.hint}
      </p>
      <div className="zotero-note-actions">
        <Button
          variant="secondary"
          onClick={save}
          disabled={saving || text.trim() === ""}
        >
          {saveLabel}
        </Button>
        <Button variant="quiet" onClick={onDone} disabled={saving}>
          {COPY.cancel}
        </Button>
      </div>
      {problem !== undefined && <Alert>{problem}</Alert>}
    </div>
  );
}

// One note in the margin: its rubric numeral, its text, and who wrote it
// and whether it waits for a sync.
function MarginNote({
  note,
  numeral,
  onEdit,
}: {
  readonly note: ZoteroReferenceNote;
  readonly numeral: string;
  readonly onEdit: ((id: ZoteroNoteId) => void) | undefined;
}): JSX.Element {
  const edit = useCallback((): void => onEdit?.(note.id), [note.id, onEdit]);
  let status = COPY.inZotero;
  if (note.waiting) {
    status = COPY.waiting;
  }
  return (
    <li className="zotero-note" data-waiting={note.waiting}>
      <span className="zotero-note-key">
        <span aria-hidden="true">{numeral}</span>
        <span className="sr-only">{COPY.key(numeral)}</span>
      </span>
      <p className="zotero-note-text">{note.text}</p>
      <p className="zotero-note-by">
        {note.author !== undefined && <span>{note.author}</span>}
        <span className="zotero-note-status">{status}</span>
        {onEdit !== undefined && note.editable && (
          <button
            type="button"
            className="zotero-note-edit"
            onClick={edit}
            aria-label={COPY.editFor(numeral)}
          >
            {COPY.edit}
          </button>
        )}
      </p>
    </li>
  );
}

// A reference's notes, keyed by the rubric numerals beside its entry, and
// a way to add one. Everyone in the quest may add and edit plain notes
// while the list is open; each waits for the owner's next sync.
function ReferenceNotes({
  place,
  entry,
  notes,
  numerals,
  open,
}: {
  readonly place: Omit<NotePlace, "noteId">;
  // The entry's text, which names its field.
  readonly entry: string;
  readonly notes: readonly ZoteroReferenceNote[];
  readonly numerals: readonly string[];
  readonly open: boolean;
}): JSX.Element | null {
  const [editing, setEditing] = useState<ZoteroNoteId | "new" | undefined>();
  const stop = useCallback((): void => setEditing(undefined), []);
  const add = useCallback((): void => setEditing("new"), []);
  let onEdit: ((id: ZoteroNoteId) => void) | undefined;
  if (open) {
    onEdit = setEditing;
  }
  if (notes.length === 0 && !open) {
    return null;
  }
  // Under notes, Add a note is a quiet line; alone, it holds the margin.
  let addClass = "zotero-note-add";
  if (notes.length > 0) {
    addClass = "zotero-note-add zotero-note-add-more";
  }
  return (
    <div className="zotero-notes">
      {notes.length > 0 && (
        <ol className="zotero-note-list" aria-label={COPY.heading}>
          {notes.map((note, index) => {
            const numeral = numerals[index] ?? "";
            if (editing === note.id) {
              return (
                <li key={note.id} className="zotero-note">
                  <NoteEditor
                    place={{ ...place, noteId: note.id }}
                    initial={note.text}
                    label={COPY.field(entry)}
                    onDone={stop}
                  />
                </li>
              );
            }
            return (
              <MarginNote
                key={note.id}
                note={note}
                numeral={numeral}
                onEdit={onEdit}
              />
            );
          })}
        </ol>
      )}
      {editing === "new" && (
        <NoteEditor
          place={{ ...place, noteId: undefined }}
          initial=""
          label={COPY.field(entry)}
          onDone={stop}
        />
      )}
      {open && editing !== "new" && (
        <button
          type="button"
          className={addClass}
          onClick={add}
          aria-label={COPY.addFor(entry)}
        >
          {COPY.add}
        </button>
      )}
    </div>
  );
}

export { ReferenceNotes };
