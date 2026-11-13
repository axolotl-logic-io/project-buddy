// The conversation as the construct reads it when several people write in one
// chat: each user message starts with a header, a text part of its own that
// says who wrote it, so the construct can tell who is speaking, and the prompt
// explains the headers (SEVERAL_AUTHORS_RULES in global-prompt.ts). Nothing
// a person types, nor their name, can pass for another person's header: the
// header is always the message's first part, and the name in it is quoted.
// A person with no name, and two people with the same name, are told apart
// by a label for each author in the chat, "person 1", "person 2" and so on,
// numbered in the order they first wrote. The construct is never sent anyone's
// email address. A chat with one author is sent exactly as it was before
// authors were recorded.

import type { UIMessage } from "ai";
import {
  type ChatMessage,
  hasSeveralAuthors,
  type MessageAuthor,
} from "@/chats/message-author.ts";
import type { UserId } from "@/ids.ts";

// A header as authorHeaders writes it.
const AUTHOR_HEADER = /^\[Message from .+\]$/u;

// How a name compares with another: two names that differ only in case look
// the same to the construct.
function nameKey(name: string): string {
  return name.toLowerCase();
}

// The header of each author's messages, by author id: their quoted name;
// their quoted name and label when another author in the chat has the same
// name; or their label alone when they have no name.
function authorHeaders(
  conversation: readonly ChatMessage[],
): ReadonlyMap<UserId, string> {
  const authors = new Map<UserId, MessageAuthor>();
  for (const { metadata } of conversation) {
    const author = metadata?.author;
    if (author !== undefined && !authors.has(author.id)) {
      authors.set(author.id, author);
    }
  }
  const nameCounts = new Map<string, number>();
  for (const { name } of authors.values()) {
    if (name !== undefined) {
      nameCounts.set(nameKey(name), (nameCounts.get(nameKey(name)) ?? 0) + 1);
    }
  }
  return new Map(
    [...authors.values()].map(({ id, name }, index): [UserId, string] => {
      const label = `person ${index + 1}`;
      if (name === undefined) {
        return [id, `[Message from ${label}]`];
      }
      const quoted = JSON.stringify(name);
      if ((nameCounts.get(nameKey(name)) ?? 0) > 1) {
        return [id, `[Message from ${quoted}, ${label}]`];
      }
      return [id, `[Message from ${quoted}]`];
    }),
  );
}

// The message's parts after its author's header, or as they are for a
// message with no author, such as the construct's.
function withHeader(
  message: ChatMessage,
  headers: ReadonlyMap<UserId, string>,
): UIMessage["parts"] {
  const author = message.metadata?.author;
  if (author === undefined) {
    return message.parts;
  }
  const header = headers.get(author.id);
  if (header === undefined) {
    return message.parts;
  }
  return [{ type: "text", text: header }, ...message.parts];
}

// The conversation to send the model, and whether its user messages have
// more than one author. With several, each user message starts with its
// author's header; with one, the messages are as they are.
function withAuthorNames(conversation: readonly ChatMessage[]): {
  readonly messages: UIMessage[];
  readonly severalAuthors: boolean;
} {
  if (!hasSeveralAuthors(conversation)) {
    return { messages: [...conversation], severalAuthors: false };
  }
  const headers = authorHeaders(conversation);
  return {
    messages: conversation.map((message) => ({
      ...message,
      parts: withHeader(message, headers),
    })),
    severalAuthors: true,
  };
}

// Whether text is an author's header, as the local command engine reads its prompt.
function isAuthorHeader(text: string): boolean {
  return AUTHOR_HEADER.test(text);
}

export { isAuthorHeader, withAuthorNames };
