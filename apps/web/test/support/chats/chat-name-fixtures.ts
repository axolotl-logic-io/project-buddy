// Chat names for tests, which cannot write a ChatName as a literal.
import { type ChatName, parseChatName } from "@/chats/chat-name.ts";

// The chat name `value`, which must be one.
export function chatNameFixture(value: string): ChatName {
  const name = parseChatName(value);
  if (name === undefined) {
    throw new Error(`Not a chat name: ${value}`);
  }
  return name;
}
