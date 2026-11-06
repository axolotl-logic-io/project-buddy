// The construct's tool for turning the user's idea into a project, from any
// chat. It starts the project as New Project does, in the chat's
// construct, so the project's interview chat opens with the construct's first
// question. It checks the acting user's gold itself rather than reusing the
// reply's grant, so a reply that spent the last gold creates no project.
import { tool } from "ai";
import { proposeQuestTransfer } from "@/chats/quest-transfer.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";
import {
  CREATE_PROJECT_DESCRIPTION,
  CREATE_PROJECT_INPUT,
  CREATE_PROJECT_OUTPUT,
  type CreateProjectInput,
  type CreateProjectOutput,
} from "@/replies/tools/create-project-contract.ts";

function createProject(
  input: CreateProjectInput,
  { context }: { context: ChatToolContext },
): Promise<CreateProjectOutput> {
  return proposeQuestTransfer(context, input);
}

// Described by its default; tools/index.ts gives each request the
// construct's description.
const createProjectTool = tool({
  description: CREATE_PROJECT_DESCRIPTION,
  inputSchema: CREATE_PROJECT_INPUT,
  outputSchema: CREATE_PROJECT_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: createProject,
});

export { createProjectTool };
