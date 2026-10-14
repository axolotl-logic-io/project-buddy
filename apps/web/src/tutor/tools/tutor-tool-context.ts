// What a tutor tool may know about the reply it runs in: whose chat it is,
// the chat and its project. A tool reads and writes only the owner's data. A tool that needs it declares `contextSchema: TUTOR_TOOL_CONTEXT`
// and reads `context` from its execute options; tools/index.ts hands it over.
import { z } from "zod";
import { CHAT_ID, PROJECT_ID, USER_ID } from "@/ids.ts";

const TUTOR_TOOL_CONTEXT = z.object({
  owner: USER_ID,
  chatId: CHAT_ID,
  projectId: PROJECT_ID,
});

// A type alias, as the AI SDK's tool context must be a plain record.
type TutorToolContext = z.infer<typeof TUTOR_TOOL_CONTEXT>;

export type { TutorToolContext };
export { TUTOR_TOOL_CONTEXT };
