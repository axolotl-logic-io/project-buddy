// A project's notes, kept in its memory, so every chat's construct reads them
// from its next reply on. Each save or delete is a new memory version by the
// user, kept in the memory's history, and lands on top of whatever version
// is newest. No model is called. Notes are open to everyone in their
// project, its owner and its members: every function takes the acting user
// first, and a project not open to them has no notes and takes none.
import type { ProjectId, UserId } from "@/ids.ts";
import type { MemoryEditOutcome } from "@/memory/memory-edit.ts";
import { changeMemory, readMemory } from "@/memory/memory-store.ts";
import { type Note, notesIn, withNote, withoutNote } from "@/notes/note.ts";

// How many of a project's notes its page lists.
const RECENT_NOTES = 10;

// Whose project and which note.
interface NoteRequest {
  readonly projectId: ProjectId;
  readonly note: Note;
}

// Adds the note to the end of the project's memory. False if the owner has
// no such project, so nothing was saved.
async function saveNote(
  owner: UserId,
  { projectId, note }: NoteRequest,
): Promise<boolean> {
  const result = await changeMemory(owner, {
    projectId,
    author: "user",
    change: (text: string): MemoryEditOutcome => withNote(text, note),
  });
  return result?.kind === "saved";
}

// The project's newest notes, newest first, as many as its page lists.
async function readRecentNotes(
  owner: UserId,
  projectId: ProjectId,
): Promise<Note[]> {
  const { text } = await readMemory(owner, projectId);
  return notesIn(text).slice(0, RECENT_NOTES);
}

// What a delete did: took the note out, found no such note in the memory,
// or found no such project of the owner's. Only "deleted" changed anything.
type NoteDeleteResult = "deleted" | "missing" | "not-found";

// Takes the note out of the project's memory. A note that isn't there, or a
// project that is not the owner's, is left as it is.
async function deleteNote(
  owner: UserId,
  { projectId, note }: NoteRequest,
): Promise<NoteDeleteResult> {
  const result = await changeMemory(owner, {
    projectId,
    author: "user",
    change: (text: string): MemoryEditOutcome => withoutNote(text, note),
  });
  if (result === undefined) {
    return "not-found";
  }
  if (result.kind === "failed") {
    return "missing";
  }
  return "deleted";
}

export type { NoteDeleteResult, NoteRequest };
export { deleteNote, RECENT_NOTES, readRecentNotes, saveNote };
