import { NOTE_MAX_LENGTH, type NoteTextProblem } from "@/spaces/quick-note.ts";

const PROBLEMS: Record<NoteTextProblem, string> = {
  empty: "Write something to save. An empty Quick Note can't be saved.",
  "too-long": `A Quick Note can be at most ${NOTE_MAX_LENGTH} characters. Shorten it.`,
};

export const QUICK_NOTE_COPY = {
  panelItem: "Quick Note",
  heading: "Quick Note",
  close: "Close Quick Note",
  intro: "Save a short note to one of your quest's spaces.",
  loading: "Loading your quests…",
  spaceLabel: "Space",
  chooseSpace: "Choose a quest and a space.",
  spaceUnavailable: "That space is no longer available in an Active quest.",
  savedToSpace: (quest: string, space: string): string =>
    `Saved to ${space} in ${quest}.`,
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
