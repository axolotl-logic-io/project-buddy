// Chat names and chat and message ids for tests, which cannot write a
// ChatName, ChatId or MessageId as a literal.
import { type ChatName, parseChatName } from "@/chats/chat-name.ts";
import {
  type ChatId,
  type MessageId,
  parseChatId,
  parseMessageId,
} from "@/ids.ts";

// A new random chat id.
export function chatIdFixture(): ChatId {
  const id = parseChatId(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("crypto.randomUUID returned a malformed UUID");
  }
  return id;
}

// The message id `value`, which must not be empty.
export function messageIdFixture(value: string): MessageId {
  const id = parseMessageId(value);
  if (id === undefined) {
    throw new Error("A message id cannot be empty");
  }
  return id;
}

// The chat name `value`, which must be one.
export function chatNameFixture(value: string): ChatName {
  const name = parseChatName(value);
  if (name === undefined) {
    throw new Error(`Not a chat name: ${value}`);
  }
  return name;
}
