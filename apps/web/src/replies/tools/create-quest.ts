// The construct's tool, in Chat only, for offering to turn the Chat into a
// quest. It creates nothing and spends nothing: its result holds the
// suggested name and starting context, which the conversation shows as Turn Chat into
// a quest, the same form the Chat's own button opens, for the user to edit
// and confirm (src/components/quest-from-chat.tsx).

import { tool } from "ai";
import {
  CREATE_QUEST_DESCRIPTION,
  CREATE_QUEST_INPUT,
  CREATE_QUEST_OUTPUT,
  type CreateQuestInput,
  type CreateQuestOutput,
} from "@/replies/tools/create-quest-contract.ts";

function offerQuest({
  name,
  summary,
  motivation,
}: CreateQuestInput): CreateQuestOutput {
  return { status: "proposed", name, summary, motivation };
}

// Described by its default; tools/index.ts gives each request the
// construct's description.
const createQuestTool = tool({
  description: CREATE_QUEST_DESCRIPTION,
  inputSchema: CREATE_QUEST_INPUT,
  outputSchema: CREATE_QUEST_OUTPUT,
  execute: offerQuest,
});

export { createQuestTool };
