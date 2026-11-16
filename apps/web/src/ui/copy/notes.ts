// The text of Quick Notes: the site panel's Quick Note dialog, and a quest's
// Quick Notes tab.
import { NOTE_MAX_LENGTH, type NoteTextProblem } from "@/notes/note.ts";

const PROBLEMS: Record<NoteTextProblem, string> = {
  empty: "Write something to save. An empty Quick Note can't be saved.",
  "too-long": `A Quick Note can be at most ${NOTE_MAX_LENGTH} characters. Shorten it.`,
};

export const QUICK_NOTE_COPY = {
  panelItem: "Quick Note",
  heading: "Quick Note",
  close: "Close Quick Note",
  intro:
    "Save a short note to a quest without opening it. Find it later in the quest's Quick Notes tab.",
  loading: "Loading your quests…",
  questLabel: "Quick Note for",
  textLabel: "Quick Note",
  textHint: `Up to ${NOTE_MAX_LENGTH} characters.`,
  save: "Save Quick Note",
  saving: "Saving the Quick Note…",
  saved: (questName: string): string => `Saved to ${questName}'s Quick Notes.`,
  problem: (problem: NoteTextProblem): string => PROBLEMS[problem],
  notFound:
    "That quest is no longer Active, so the Quick Note wasn't saved. Choose another quest.",
  failed: "The Quick Note couldn't be saved. Try again.",
  invalid: "Choose a quest and write a Quick Note.",
  noQuests:
    "Quick Notes go to an Active quest. Start a quest or restore one from Quests first.",
  noQuestsLink: "Go to Quests",
} as const;

export const QUEST_NOTES_COPY = {
  heading: "Quick Notes",
  none: "No Quick Notes yet. Save one from Quick Note in the site panel.",
  edit: "Edit Quick Note",
  save: "Save Quick Note",
  cancel: "Cancel editing Quick Note",
  actions: (text: string): string => `Actions for the Quick Note "${text}"`,
  delete: "Delete",
  deleteLabel: (text: string): string => `Delete the Quick Note "${text}"`,
} as const;
