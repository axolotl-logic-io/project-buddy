// A project's notes, kept in its memory, so every chat's buddy reads them
// from its next reply on. Each save or delete is a new memory version by the
// user, kept in the memory's history, and lands on top of whatever version
// is newest. No model is called. A note belongs to its project's user:
// every function takes the owner first, and another user's project has no
// notes and takes none.
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

// Takes the note out of the project's memory. A note that is gone already,
// or a project that is not the owner's, is left as it is.
async function deleteNote(
  owner: UserId,
  { projectId, note }: NoteRequest,
): Promise<void> {
  await changeMemory(owner, {
    projectId,
    author: "user",
    change: (text: string): MemoryEditOutcome => withoutNote(text, note),
  });
}

export type { NoteRequest };
export { deleteNote, RECENT_NOTES, readRecentNotes, saveNote };
