// A chat's name, whether Claude Haiku suggested it or she typed it: one line
// of text, trimmed, never empty, and short enough to read at a glance in the
// project's chat list and the chat page's heading. The browser imports this
// module, so it imports nothing server-only.
import { z } from "zod";

// Sixty characters hold a name of about eight words, more than a chat name
// needs, yet stay on one line of the chat list in the narrow page column.
const CHAT_NAME_MAX_LENGTH = 60;

// Any line break, including Unicode's line and paragraph separators.
const LINE_BREAK = /[\r\n\u2028\u2029]/u;

// Why a value is not a chat name once trimmed: it is empty, it holds a line
// break, or it is longer than CHAT_NAME_MAX_LENGTH.
type ChatNameProblem = "empty" | "multi-line" | "too-long";

// The one rule for a trimmed name, which CHAT_NAME and checkChatName share.
// A name with more than one problem gets the first in the order above.
function trimmedNameProblem(name: string): ChatNameProblem | undefined {
  if (name === "") {
    return "empty";
  }
  if (LINE_BREAK.test(name)) {
    return "multi-line";
  }
  if (name.length > CHAT_NAME_MAX_LENGTH) {
    return "too-long";
  }
  return undefined;
}

const CHAT_NAME = z
  .string()
  .trim()
  .refine((name) => trimmedNameProblem(name) === undefined)
  .brand<"ChatName">();

// A chat's name, as `parseChatName` returns it.
type ChatName = z.infer<typeof CHAT_NAME>;

// What checkChatName found: a chat name, or why the value isn't one.
type ChatNameCheck =
  | { readonly kind: "valid"; readonly name: ChatName }
  | { readonly kind: "refused"; readonly problem: ChatNameProblem };

// The value trimmed, as a ChatName, or undefined unless it is one non-empty
// line of at most CHAT_NAME_MAX_LENGTH characters.
function parseChatName(value: string): ChatName | undefined {
  return CHAT_NAME.safeParse(value).data;
}

// The value trimmed, as a ChatName, or the reason it is refused, by the same
// rule as parseChatName.
function checkChatName(value: string): ChatNameCheck {
  const problem = trimmedNameProblem(value.trim());
  if (problem !== undefined) {
    return { kind: "refused", problem };
  }
  return { kind: "valid", name: CHAT_NAME.parse(value) };
}

export type { ChatName, ChatNameCheck, ChatNameProblem };
export { CHAT_NAME, CHAT_NAME_MAX_LENGTH, checkChatName, parseChatName };
