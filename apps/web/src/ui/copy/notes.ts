// The text of the Quick Note page, the header's way to save a Quick Note to
// a project, and of a project's Quick Notes on its page.
import { NOTE_MAX_LENGTH } from "@/notes/note.ts";
import { pageTitle } from "@/ui/copy/site.ts";

export const QUICK_CAPTURE_COPY = {
  draftHint:
    "Unsaved Quick Notes stay in this browser until saved or discarded.",
  discard: "Discard changes",
  title: pageTitle("Quick Note"),
  headerLink: "Quick Note",
  heading: "Quick Note",
  intro:
    "Save a Quick Note for a project without starting a chat. The Quick Note is saved, with today's date, in the project's memory, so the buddy knows it in the project's next reply.",
  loading: "Loading Quick Note…",
  projectLabel: "Quick Note for",
  textLabel: "Quick Note",
  textHint: `One line, up to ${NOTE_MAX_LENGTH} characters. Line breaks become spaces.`,
  save: "Save Quick Note",
  saving: "Saving the Quick Note…",
  saved: (projectName: string): string => `Saved to ${projectName}'s memory.`,
  empty: "Write something to save. An empty Quick Note can't be saved.",
  tooLong: `A Quick Note can be at most ${NOTE_MAX_LENGTH} characters. Shorten it, or put the rest in the project's memory.`,
  noProjects:
    "Quick Notes go into a project's memory, and you have no projects yet. Start a project first.",
  noProjectsLink: "Go to Projects",
} as const;

export const PROJECT_NOTES_COPY = {
  heading: "Quick Notes",
  intro:
    "Your newest Quick Notes in this project's memory. Deleting one takes it out of the memory; the memory's history keeps every version.",
  none: "No Quick Notes yet.",
  addLink: "Add a Quick Note",
  delete: "Delete",
  deleteLabel: (text: string): string => `Delete the Quick Note "${text}"`,
  deleted: "Quick Note deleted.",
  missing:
    "Nothing was deleted: the project's memory no longer holds that Quick Note as it was listed. The list now shows the memory as it is.",
} as const;
