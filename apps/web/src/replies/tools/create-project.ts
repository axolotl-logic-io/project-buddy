// The buddy's tool for turning the user's idea into a project, from their
// central chat. It starts the project as New Project does, in the chat's
// buddy, so the project's interview chat opens with the buddy's first
// question. It checks the owner's quota itself rather than reusing the
// reply's grant, so a reply that crossed the quota creates no project.
import { tool } from "ai";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { startProject } from "@/chats/start-chat.ts";
import {
  CENTRAL_TOOL_CONTEXT,
  type CentralToolContext,
} from "@/replies/tools/chat-tool-context.ts";
import {
  CREATE_PROJECT_DESCRIPTION,
  CREATE_PROJECT_INPUT,
  CREATE_PROJECT_OUTPUT,
  type CreateProjectInput,
  type CreateProjectOutput,
} from "@/replies/tools/create-project-contract.ts";

async function createProject(
  { name }: CreateProjectInput,
  { context }: { context: CentralToolContext },
): Promise<CreateProjectOutput> {
  // The chat's buddy is saved under the default buddy's id, as New Project
  // saves one of the user's own.
  const started = await startProject(context.owner, name, {
    id: DEFAULT_BUDDY_ID,
    name: context.buddy.name,
    parts: context.buddy.parts,
  });
  switch (started.kind) {
    case "started":
      return {
        status: "created",
        projectId: started.chat.projectId,
        name,
        interviewChatId: started.chat.id,
      };
    case "claudeUnavailable":
      return { status: "claudeUnavailable" };
    case "quotaUsedUp":
      return {
        status: "quotaUsedUp",
        resetsOn: started.resetsOn.toISOString(),
      };
    default: {
      const unknownResult: never = started;
      return unknownResult;
    }
  }
}

// Described by its default; tools/index.ts gives each request the
// buddy's description.
const createProjectTool = tool({
  description: CREATE_PROJECT_DESCRIPTION,
  inputSchema: CREATE_PROJECT_INPUT,
  outputSchema: CREATE_PROJECT_OUTPUT,
  contextSchema: CENTRAL_TOOL_CONTEXT,
  execute: createProject,
});

export { createProjectTool };
