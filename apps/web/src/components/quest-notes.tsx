"use client";

import { type JSX, useCallback, useRef, useState } from "react";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { usePanelSend } from "@/components/chat/chat-send.ts";
import { LocalTime } from "@/components/local-time.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { Note, NoteId } from "@/notes/note.ts";
import { QUEST_NOTES_COPY } from "@/ui/copy/notes.ts";

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
// sends /drop-note to the quest's conversation. A deleted note's button goes
// with it, so focus moves to the list's heading, and the status line says
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
    (id: NoteId): void => {
      const index = notes.findIndex((note) => note.id === id);
      if (index < 0) {
        return;
      }
      send(PANEL_COMMAND.dropNote(index + 1))
        .then((result) => {
          if (result.sent) {
            setNotes((current) => current.filter((note) => note.id !== id));
            headingRef.current?.focus();
          }
        })
        .catch(() => undefined);
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
