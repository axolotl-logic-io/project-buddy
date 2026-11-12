// The text of Chat, and of Turn Chat into a quest.
import { pageTitle } from "@/ui/copy/site.ts";

// Chat, the private conversation for talking without a goal.
export const STANDALONE_CHAT_COPY = {
  title: pageTitle("Chat"),
  heading: "Chat",
  intro:
    "Talk with a construct without a goal. Only you can see this conversation.",
} as const;

// Turn Chat into a quest: the shared quest start, on Do a thing, with a
// summary of the Chat, or the construct's offer, as the opening conversation.
export const QUEST_FROM_CHAT_COPY = {
  open: "Turn Chat into a quest",
  openOffer: (name: string): string => `Turn Chat into a quest: ${name}`,
  heading: "Turn Chat into a quest",
  closeDialog: "Close",
  intro:
    "The Chat summary becomes your opening conversation. Choose a construct and optionally say why this quest matters to you. This Chat stays private and keeps its messages.",
} as const;
