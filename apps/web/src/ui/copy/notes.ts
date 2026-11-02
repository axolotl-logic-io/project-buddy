// The text of quick capture, the header's way to save a note to a project,
// and of a project's notes on its page.
import { NOTE_MAX_LENGTH } from "@/notes/note.ts";
import { pageTitle } from "@/ui/copy/site.ts";

export const QUICK_CAPTURE_COPY = {
  title: pageTitle("Quick note"),
  headerLink: "Note",
  headerLinkLabel: "Quick note",
  heading: "Quick note",
  intro:
    "Save a quick note for a project without starting a chat. The note is saved, with today's date, in the project's memory, so the buddy knows it in the project's next reply.",
  loading: "Loading quick note…",
  projectLabel: "Note for",
  textLabel: "Note",
  textHint: `One line, up to ${NOTE_MAX_LENGTH} characters. Line breaks become spaces.`,
  save: "Save note",
  saving: "Saving the note…",
  saved: (projectName: string): string => `Saved to ${projectName}'s memory.`,
  empty: "Write something to save. An empty note can't be saved.",
  tooLong: `A note can be at most ${NOTE_MAX_LENGTH} characters. Shorten it, or put the rest in the project's memory.`,
  noProjects:
    "Notes go into a project's memory, and you have no projects yet. Start a project first.",
  noProjectsLink: "Go to Projects",
} as const;

export const PROJECT_NOTES_COPY = {
  heading: "Notes",
  intro:
    "Your newest quick notes in this project's memory. Deleting one takes it out of the memory; the memory's history keeps every version.",
  none: "No notes yet.",
  addLink: "Add a note",
  delete: "Delete",
  deleteLabel: (text: string): string => `Delete the note "${text}"`,
  deleted: "Note deleted.",
  missing:
    "Nothing was deleted: the project's memory no longer holds that note as it was listed. The list now shows the memory as it is.",
} as const;
