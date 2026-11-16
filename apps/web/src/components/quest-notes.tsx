"use client";

import { type JSX, useCallback, useRef, useState } from "react";
import { LocalTime } from "@/components/local-time.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import type { Note, NoteId, NoteResult } from "@/notes/note.ts";
import { QUEST_NOTES_COPY } from "@/ui/copy/notes.ts";

type DeleteNote = (request: {
  readonly questId: QuestId;
  readonly id: NoteId;
}) => Promise<NoteResult>;

function NoteRow({
  note,
  busy,
  onDelete,
}: {
  readonly note: Note;
  readonly busy: boolean;
  readonly onDelete: (id: NoteId) => void;
}): JSX.Element {
  const remove = useCallback(
    (): void => onDelete(note.id),
    [note.id, onDelete],
  );
  return (
    <li>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <p className="text-muted">
          <LocalTime dateTime={note.savedAt} detail="day" />
        </p>
        <Button
          aria-label={QUEST_NOTES_COPY.deleteLabel(note.text)}
          disabled={busy}
          onClick={remove}
          variant="quiet"
        >
          <Icon name="trash" />
          {QUEST_NOTES_COPY.delete}
        </Button>
      </div>
      <p className="wrap-anywhere whitespace-pre-wrap">{note.text}</p>
    </li>
  );
}

// A quest's Quick Notes, newest first, each with its day and a button that
// deletes it. A deleted note's button goes with it, so focus moves to the
// list's heading, and the status line says it was deleted.
function QuestNotes({
  questId,
  notes: savedNotes,
  action,
}: {
  readonly questId: QuestId;
  readonly notes: readonly Note[];
  readonly action: DeleteNote;
}): JSX.Element {
  const [notes, setNotes] = useState(savedNotes);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const headingRef = useRef<HTMLParagraphElement>(null);
  // A route refresh can add a note saved from the site panel.
  const [previous, setPrevious] = useState(savedNotes);
  if (previous !== savedNotes) {
    setPrevious(savedNotes);
    setNotes(savedNotes);
  }
  const remove = useCallback(
    (id: NoteId): void => {
      setBusy(true);
      setStatus(undefined);
      setFailure(undefined);
      action({ questId, id })
        .then(() => {
          setNotes((current) => current.filter((note) => note.id !== id));
          setStatus(QUEST_NOTES_COPY.deleted);
          headingRef.current?.focus();
        })
        .catch(() => setFailure(QUEST_NOTES_COPY.failed))
        .finally(() => setBusy(false));
    },
    [action, questId],
  );
  return (
    <section className="page-slot">
      <p className="sr-only" ref={headingRef} tabIndex={-1}>
        {QUEST_NOTES_COPY.heading}
      </p>
      <FormStatus>{status}</FormStatus>
      {failure !== undefined && <Alert>{failure}</Alert>}
      {notes.length === 0 && (
        <p className="text-muted">{QUEST_NOTES_COPY.none}</p>
      )}
      {notes.length > 0 && (
        <ul aria-label={QUEST_NOTES_COPY.heading} className="divided-rows">
          {notes.map((note) => (
            <NoteRow busy={busy} key={note.id} note={note} onDelete={remove} />
          ))}
        </ul>
      )}
    </section>
  );
}

export { QuestNotes };
