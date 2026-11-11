// The construct's tool, in Chat only, for offering to turn the Chat into a
// quest. It creates nothing and spends nothing: its result holds the
// suggested name and Journal, which the conversation shows as Turn Chat into
// a quest, the same form the Chat's own button opens, for the user to edit
// and confirm (src/components/quest-from-chat.tsx).
import { tool } from "ai";
import {
  CREATE_PROJECT_DESCRIPTION,
  CREATE_PROJECT_INPUT,
  CREATE_PROJECT_OUTPUT,
  type CreateProjectInput,
  type CreateProjectOutput,
} from "@/replies/tools/create-project-contract.ts";

function offerQuest({
  name,
  summary,
  motivation,
}: CreateProjectInput): CreateProjectOutput {
  return { status: "proposed", name, summary, motivation };
}

// Described by its default; tools/index.ts gives each request the
// construct's description.
const createProjectTool = tool({
  description: CREATE_PROJECT_DESCRIPTION,
  inputSchema: CREATE_PROJECT_INPUT,
  outputSchema: CREATE_PROJECT_OUTPUT,
  execute: offerQuest,
});

export { createProjectTool };
