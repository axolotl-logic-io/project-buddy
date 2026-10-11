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

const CHAT_NAME = z
  .string()
  .trim()
  .min(1)
  .max(CHAT_NAME_MAX_LENGTH)
  .refine((name) => !LINE_BREAK.test(name), "A chat name is one line.")
  .brand<"ChatName">();

// A chat's name, as `parseChatName` returns it.
type ChatName = z.infer<typeof CHAT_NAME>;

// The value trimmed, as a ChatName, or undefined unless it is one non-empty
// line of at most CHAT_NAME_MAX_LENGTH characters.
function parseChatName(value: string): ChatName | undefined {
  return CHAT_NAME.safeParse(value).data;
}

export type { ChatName };
export { CHAT_NAME, CHAT_NAME_MAX_LENGTH, parseChatName };
