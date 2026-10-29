// The buddy's tool for changing its chat's project memory. It edits rather
// than rewrites: it names the text it replaces, so a change the user saved
// meanwhile is kept, and an edit whose text is gone saves nothing.
import { tool } from "ai";
import { AppError } from "@/errors/app-error.ts";
import type { MemoryEdit } from "@/memory/memory-edit.ts";
import { editMemory } from "@/memory/memory-store.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";
import {
  UPDATE_MEMORY_DESCRIPTION,
  UPDATE_MEMORY_INPUT,
  UPDATE_MEMORY_OUTPUT,
  type UpdateMemoryOutput,
} from "@/replies/tools/update-memory-contract.ts";

async function updateMemory(
  edit: MemoryEdit,
  { context }: { context: ChatToolContext },
): Promise<UpdateMemoryOutput> {
  const result = await editMemory(context.owner, {
    projectId: context.projectId,
    edit,
    author: "buddy",
  });
  if (result === undefined) {
    // The reply's chat is read for its owner, so its project is the owner's;
    // a project that is not reads as not found, as everywhere else.
    throw new AppError(
      "not-found",
      new Error("No such project to edit the memory of"),
    );
  }
  switch (result.kind) {
    case "saved":
      return {
        status: "updated",
        version: result.memory.version,
        oldText: edit.oldText,
        newText: edit.newText,
      };
    case "failed":
      return {
        status: "not-applied",
        reason: result.reason,
        memory: result.memory.text,
      };
    default:
      return result satisfies never;
  }
}

// Described by its default; tools/index.ts gives each request the
// buddy's description.
const updateMemoryTool = tool({
  description: UPDATE_MEMORY_DESCRIPTION,
  inputSchema: UPDATE_MEMORY_INPUT,
  outputSchema: UPDATE_MEMORY_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: updateMemory,
});

export { updateMemoryTool };
