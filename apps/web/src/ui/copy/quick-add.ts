import {
  QUICK_ADD_MAX_LENGTH,
  type QuickAddTextProblem,
} from "@/lists/quick-add.ts";

const PROBLEMS: Record<QuickAddTextProblem, string> = {
  empty: "Write something to add. Empty text can't be saved.",
  "too-long": `Quick Add takes at most ${QUICK_ADD_MAX_LENGTH} characters. Shorten it.`,
};

export const QUICK_ADD_COPY = {
  panelItem: "Quick Add",
  heading: "Quick Add",
  close: "Close Quick Add",
  intro: "Add to one of your quest's lists without opening it.",
  loading: "Loading your quests…",
  listLabel: "List",
  chooseList: "Choose a quest and a list.",
  listUnavailable: "That list is no longer available in an Active quest.",
  tooLongForList:
    "That list takes one line of up to 200 characters. Shorten the text or choose a list of notes.",
  savedToList: (quest: string, list: string): string =>
    `Saved to ${list} in ${quest}.`,
  questLabel: "Quick Add to",
  textLabel: "Text",
  textHint: `Up to ${QUICK_ADD_MAX_LENGTH} characters.`,
  save: "Add",
  saving: "Adding…",
  saved: (questName: string): string => `Added to ${questName}.`,
  problem: (problem: QuickAddTextProblem): string => PROBLEMS[problem],
  notFound:
    "That quest is no longer Active, so nothing was added. Choose another quest.",
  failed: "The text couldn't be added. Try again.",
  invalid: "Choose a quest and write something to add.",
  noQuests:
    "Quick Add adds to an Active quest. Start a quest or restore one from Quests first.",
  noQuestsLink: "Go to Quests",
} as const;
