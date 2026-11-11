// The summary Chat's Turn Chat into a quest offers to edit first: what the
// user said most recently, so she starts from her own words rather than an
// empty box. It is built without the model, so offering it spends nothing,
// and it is only a draft: nothing leaves her Chat until she confirms it.
import type { UIMessage } from "ai";

// How many of her latest messages the draft quotes, and how much of each.
const DRAFT_MESSAGES = 5;
const DRAFT_MESSAGE_LENGTH = 400;

// Runs of whitespace, folded to one space so each message is one line.
const WHITESPACE = /\s+/gu;

// A message's text parts as one line, cut to DRAFT_MESSAGE_LENGTH.
function oneLine({ parts }: UIMessage): string {
  const text = parts
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join(" ")
    .replace(WHITESPACE, " ")
    .trim();
  if (text.length <= DRAFT_MESSAGE_LENGTH) {
    return text;
  }
  return `${text.slice(0, DRAFT_MESSAGE_LENGTH - 1).trimEnd()}…`;
}

// The draft for messages, oldest first: the user's latest messages with
// text, oldest first, one list item each, each cut short if long; empty
// when she has written none.
function chatSummaryDraft(messages: readonly UIMessage[]): string {
  const said = messages
    .filter((message) => message.role === "user")
    .map(oneLine)
    .filter((line) => line !== "")
    .slice(-DRAFT_MESSAGES);
  return said.map((line) => `- ${line}`).join("\n");
}

export { chatSummaryDraft };
