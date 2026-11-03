// Who wrote each user message of a chat: its author. Several people can
// write in one chat, so the chat store reads every user message with its
// author in its metadata, and the chat screen and the buddy's prompt name
// the author from there. A buddy's message has no author. The browser
// imports this module, so it imports nothing server-only.
import type { UIMessage } from "ai";
import type { UserId } from "@/ids.ts";

// The user who wrote a message: their name, the one they asked the buddy to
// call them (src/accounts/user-name.ts), undefined when they have none, and
// their email address. The chat screen shows the name, or the email address
// without one (authorDisplayName); the buddy is never sent the address
// (src/replies/author-names.ts).
interface MessageAuthor {
  readonly id: UserId;
  readonly name: string | undefined;
  readonly email: string;
}

// What the chat store reads beside a message's parts.
interface ChatMessageMetadata {
  // The user message's author; undefined on the buddy's messages and on a
  // message not saved yet.
  readonly author?: MessageAuthor | undefined;
}

// A message of a chat, with its author if it is a user message.
type ChatMessage = UIMessage<ChatMessageMetadata>;

// The author of the user with this id, name and email, as the users table
// holds them.
function toMessageAuthor({
  id,
  name,
  email,
}: {
  readonly id: UserId;
  readonly name: string | null | undefined;
  readonly email: string;
}): MessageAuthor {
  return { id, name: name ?? undefined, email };
}

// The name the chat screen shows for the author: their name, or their email
// address if they have none.
function authorDisplayName({ name, email }: MessageAuthor): string {
  return name ?? email;
}

// The message with author as its author.
function withAuthor<Message extends UIMessage>(
  message: Message,
  author: MessageAuthor,
): Message & ChatMessage {
  return { ...message, metadata: { author } };
}

// The ids of the authors of the messages' user messages.
function authorIds(messages: readonly ChatMessage[]): ReadonlySet<UserId> {
  return new Set(
    messages.flatMap(({ metadata }) => {
      if (metadata?.author === undefined) {
        return [];
      }
      return [metadata.author.id];
    }),
  );
}

// Whether the messages' user messages have more than one author.
function hasSeveralAuthors(messages: readonly ChatMessage[]): boolean {
  return authorIds(messages).size > 1;
}

// The names of the authors of the user messages someone other than viewer
// wrote, by message id, which the chat screen shows on those messages.
function otherAuthorNames(
  messages: readonly ChatMessage[],
  viewer: UserId,
): ReadonlyMap<string, string> {
  return new Map(
    messages.flatMap(({ id, metadata }): [string, string][] => {
      const author = metadata?.author;
      if (author === undefined || author.id === viewer) {
        return [];
      }
      return [[id, authorDisplayName(author)]];
    }),
  );
}

export type { ChatMessage, ChatMessageMetadata, MessageAuthor };
export {
  authorDisplayName,
  hasSeveralAuthors,
  otherAuthorNames,
  toMessageAuthor,
  withAuthor,
};
