// The conversation as the buddy reads it when several people write in one
// chat: each user message starts with its author's name, so the buddy can
// tell who is speaking, and the prompt explains the names
// (SEVERAL_AUTHORS_RULES in global-prompt.ts). A chat with one author is
// sent exactly as it was before authors were recorded.
import type { UIMessage } from "ai";
import { type ChatMessage, hasSeveralAuthors } from "@/chats/message-author.ts";

// The message's parts with its author's name first: before its first text
// as "Alex: …", or as a text part of its own before an image.
function namedParts(message: ChatMessage): UIMessage["parts"] {
  const author = message.metadata?.author;
  if (author === undefined) {
    return message.parts;
  }
  const [first, ...rest] = message.parts;
  if (first?.type === "text") {
    return [{ ...first, text: `${author.name}: ${first.text}` }, ...rest];
  }
  return [{ type: "text", text: `${author.name}:` }, ...message.parts];
}

// The conversation to send the model, and whether its user messages have
// more than one author. With several, each user message starts with its
// author's name; with one, the messages are as they are.
function withSpeakerNames(conversation: readonly ChatMessage[]): {
  readonly messages: UIMessage[];
  readonly severalAuthors: boolean;
} {
  if (!hasSeveralAuthors(conversation)) {
    return { messages: [...conversation], severalAuthors: false };
  }
  return {
    messages: conversation.map((message) => ({
      ...message,
      parts: namedParts(message),
    })),
    severalAuthors: true,
  };
}

export { withSpeakerNames };
