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
    "Save a Quick Note for a quest without starting a chat. The Quick Note is saved, with today's date, in the quest's memory, so your construct knows it in the quest's next reply.",
  loading: "Loading Quick Note…",
  projectLabel: "Quick Note for",
  textLabel: "Quick Note",
  textHint: `One line, up to ${NOTE_MAX_LENGTH} characters. Line breaks become spaces.`,
  save: "Save Quick Note",
  saving: "Saving the Quick Note…",
  saved: (projectName: string): string => `Saved to ${projectName}'s memory.`,
  empty: "Write something to save. An empty Quick Note can't be saved.",
  tooLong: `A Quick Note can be at most ${NOTE_MAX_LENGTH} characters. Shorten it, or put the rest in the quest's memory.`,
  noProjects:
    "Quick Notes go into a quest's memory, and you have no quests yet. Start a quest first.",
  noProjectsLink: "Go to Quests",
} as const;

export const PROJECT_NOTES_COPY = {
  heading: "Quick Notes",
  intro:
    "Your newest Quick Notes in this quest's memory. Deleting one takes it out of the memory; the memory's history keeps every version.",
  none: "No Quick Notes yet.",
  addLink: "Add a Quick Note",
  delete: "Delete",
  deleteLabel: (text: string): string => `Delete the Quick Note "${text}"`,
  deleted: "Quick Note deleted.",
  missing:
    "Nothing was deleted: the quest's memory no longer holds that Quick Note as it was listed. The list now shows the memory as it is.",
} as const;
