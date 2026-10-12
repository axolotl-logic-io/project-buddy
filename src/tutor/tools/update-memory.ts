// The tutor's tool for changing its chat's project memory. It edits rather
// than rewrites: it names the text it replaces, so a change the user saved
// meanwhile is kept, and an edit whose text is gone saves nothing.
import { tool } from "ai";
import type { MemoryEdit } from "@/memory/memory-edit.ts";
import { editMemory } from "@/memory/memory-store.ts";
import {
  TUTOR_TOOL_CONTEXT,
  type TutorToolContext,
} from "@/tutor/tools/tutor-tool-context.ts";
import {
  UPDATE_MEMORY_INPUT,
  UPDATE_MEMORY_OUTPUT,
  type UpdateMemoryOutput,
} from "@/tutor/tools/update-memory-contract.ts";

const DESCRIPTION = [
  "Change the project's memory: the Markdown document, shown in your instructions, that every chat in this project shares and reads.",
  "Keep it current: record the user's goals, milestones, progress and preferences when they report progress, change a goal or state a preference.",
  "Each call replaces oldText with newText and saves a new version, which the user sees in the chat and can undo.",
  "If oldText is not in the memory exactly once, for example because the user changed the memory meanwhile, nothing is saved and the result gives the memory as it is now.",
].join(" ");

async function updateMemory(
  edit: MemoryEdit,
  { context }: { context: TutorToolContext },
): Promise<UpdateMemoryOutput> {
  const result = await editMemory(context.owner, {
    projectId: context.projectId,
    edit,
    author: "tutor",
  });
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

const updateMemoryTool = tool({
  description: DESCRIPTION,
  inputSchema: UPDATE_MEMORY_INPUT,
  outputSchema: UPDATE_MEMORY_OUTPUT,
  contextSchema: TUTOR_TOOL_CONTEXT,
  execute: updateMemory,
});

export { updateMemoryTool };
