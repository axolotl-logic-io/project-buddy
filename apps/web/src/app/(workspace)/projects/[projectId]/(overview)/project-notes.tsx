"use client";

import Link from "next/link";
import {
  type JSX,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { formatTime } from "@/components/time-format.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { ProjectId } from "@/ids.ts";
import type { Note } from "@/notes/note.ts";
import type { QuestStatus } from "@/projects/quest-status.ts";
import { PROJECT_NOTES_COPY } from "@/ui/copy/notes.ts";
import { type DeleteNoteState, deleteNoteAction } from "./actions.ts";

const IDLE: DeleteNoteState = { kind: "idle" };

// A note's day as the site writes days, such as "Nov 02, 2026". The day is
// a calendar day, the same in every zone.
function writtenDay(day: string): string {
  return formatTime(new Date(`${day}T00:00:00Z`), "day", "UTC");
}

// A key for each note: its day and text, and, for a note the same as one
// before it, how many came before.
function noteKeys(notes: readonly Note[]): string[] {
  const seen = new Map<string, number>();
  return notes.map(({ day, text }) => {
    const key = `${day} ${text}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return `${key} ${count}`;
  });
}

// A project's newest notes, newest first, each with a button that deletes
// it, and, for an Active quest, a link to Quick Note with the quest chosen.
// A delete's button is disabled while it runs, and is gone with its note, so focus
// moves to the section's heading. The status line says a note was deleted;
// an alert says why nothing was, when nothing was.
export function ProjectNotes({
  projectId,
  status: questStatus,
  notes,
}: {
  readonly projectId: ProjectId;
  readonly status: QuestStatus;
  readonly notes: readonly Note[];
}): JSX.Element {
  const [state, formAction, pending] = useActionState(deleteNoteAction, IDLE);
  const [shownState, setShownState] = useState(state);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  if (state !== shownState) {
    setShownState(state);
  }
  useEffect(() => {
    if (shownState.kind !== "idle") {
      headingRef.current?.focus();
    }
  }, [shownState]);

  const keys = noteKeys(notes);
  let status = "";
  if (state.kind === "deleted" && !pending) {
    status = PROJECT_NOTES_COPY.deleted;
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          className="section-heading"
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
        >
          {PROJECT_NOTES_COPY.heading}
        </h2>
        {questStatus === "active" && (
          <Button asChild={true} variant="secondary">
            <Link href={`/capture?projectId=${projectId}`}>
              {PROJECT_NOTES_COPY.addLink}
            </Link>
          </Button>
        )}
      </div>
      <p className="text-muted">{PROJECT_NOTES_COPY.intro}</p>
      {notes.length === 0 && (
        <p className="text-muted">{PROJECT_NOTES_COPY.none}</p>
      )}
      {notes.length > 0 && (
        <ul aria-labelledby={headingId} className="flex flex-col gap-3">
          {notes.map((note, index) => (
            <li className="card flex flex-col gap-2" key={keys[index]}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
                <time
                  className="font-mono text-muted tabular-nums"
                  dateTime={note.day}
                >
                  {writtenDay(note.day)}
                </time>
                <form action={formAction}>
                  <input name="projectId" type="hidden" value={projectId} />
                  <input name="day" type="hidden" value={note.day} />
                  <input name="text" type="hidden" value={note.text} />
                  <Button
                    aria-label={PROJECT_NOTES_COPY.deleteLabel(note.text)}
                    disabled={pending}
                    type="submit"
                    variant="quiet"
                  >
                    <Icon name="trash" />
                    {PROJECT_NOTES_COPY.delete}
                  </Button>
                </form>
              </div>
              <p className="wrap-anywhere">{note.text}</p>
            </li>
          ))}
        </ul>
      )}
      {(state.kind === "missing" || state.kind === "failed") && !pending && (
        <Alert>{state.message}</Alert>
      )}
      <FormStatus>{status}</FormStatus>
    </section>
  );
}
