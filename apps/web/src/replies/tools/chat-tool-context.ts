// What a construct tool may know about the reply it runs in: whose chat it is,
// the chat, its quest, and the user message the
// reply answers. A tool reads and
// writes only the acting user's data. A tool that needs it declares
// `contextSchema: CHAT_TOOL_CONTEXT` and reads `context` from its execute
// options; tools/index.ts hands it over. The context is never sent to the
// provider.

import { z } from "zod";
import { CHAT_ID, MESSAGE_ID, QUEST_ID, USER_ID } from "@/ids.ts";

const CHAT_TOOL_CONTEXT = z.object({
  actingUser: USER_ID,
  chatId: CHAT_ID,
  questId: QUEST_ID,
  answeredId: MESSAGE_ID,
});

// A type alias, as the AI SDK's tool context must be a plain record.
type ChatToolContext = z.infer<typeof CHAT_TOOL_CONTEXT>;

export type { ChatToolContext };
export { CHAT_TOOL_CONTEXT };
