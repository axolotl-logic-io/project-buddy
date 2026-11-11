// The text of the start action on Constructs, of Chat, and of Chat's Start
// a quest from this.
import { pageTitle } from "@/ui/copy/site.ts";

// A Construct's start action, which starts a quest with it.
export const START_WORK_COPY = {
  constructDialogHeading: (name: string): string =>
    `Start a quest with ${name}`,
  closeDialog: "Close",
} as const;

// Chat, the private conversation for talking without a goal.
export const STANDALONE_CHAT_COPY = {
  title: pageTitle("Chat"),
  heading: "Chat",
  intro:
    "Talk with a construct without a goal. Only you can see this conversation.",
} as const;

// Chat's Start a quest from this: the premade quest start, on Do a thing,
// with a summary of the Chat as the Journal to edit and confirm.
export const QUEST_FROM_CHAT_COPY = {
  open: "Start a quest from this",
  heading: "Start a quest from this",
  closeDialog: "Close",
  intro:
    "Only the name and Journal you confirm go into the new quest. This Chat stays private and keeps its messages, even if you later invite people to the quest.",
} as const;
