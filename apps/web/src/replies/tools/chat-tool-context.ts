// What a buddy tool may know about the reply it runs in: whose chat it is,
// the chat and its project, or, in the user's central chat, which is in no
// project, the chat and its buddy. A tool reads and writes only the owner's
// data. A tool that needs it declares `contextSchema: CHAT_TOOL_CONTEXT`
// (or CENTRAL_TOOL_CONTEXT) and reads `context` from its execute options;
// tools/index.ts hands it over. The context is never sent to the provider.
import { z } from "zod";
import { BUDDY_PARTS } from "@/buddies/buddy-parts-schema.ts";
import { CHAT_ID, PROJECT_ID, USER_ID } from "@/ids.ts";

const CHAT_TOOL_CONTEXT = z.object({
  owner: USER_ID,
  chatId: CHAT_ID,
  projectId: PROJECT_ID,
});

// A type alias, as the AI SDK's tool context must be a plain record.
type ChatToolContext = z.infer<typeof CHAT_TOOL_CONTEXT>;

const CENTRAL_TOOL_CONTEXT = z.object({
  owner: USER_ID,
  chatId: CHAT_ID,
  buddy: z.object({ name: z.string(), parts: BUDDY_PARTS }),
});

type CentralToolContext = z.infer<typeof CENTRAL_TOOL_CONTEXT>;

export type { CentralToolContext, ChatToolContext };
export { CENTRAL_TOOL_CONTEXT, CHAT_TOOL_CONTEXT };
