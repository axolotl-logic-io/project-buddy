// Chat names for tests, which cannot write a ChatName as a literal.
import { type ChatName, parseChatName } from "@/chats/chat-name.ts";

// Unicode's line and paragraph separators, which a pasted name may hold and
// a text field keeps, unlike CR and LF.
export const LINE_SEPARATOR = "\u2028";
export const PARAGRAPH_SEPARATOR = "\u2029";

// The chat name `value`, which must be one.
export function chatNameFixture(value: string): ChatName {
  const name = parseChatName(value);
  if (name === undefined) {
    throw new Error(`Not a chat name: ${value}`);
  }
  return name;
}
