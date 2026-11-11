import { tool } from "ai";
import type { z } from "zod";
import type { SectionEdit } from "@/journal/journal.ts";
import { writeSection } from "@/journal/journal-store.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";
import {
  CHANGE_PREFERENCES_DESCRIPTION,
  CHANGE_PREFERENCES_INPUT,
  SECTION_OUTPUT,
  SET_GOAL_DESCRIPTION,
  SET_GOAL_INPUT,
} from "@/replies/tools/journal-contract.ts";

type SectionOutput = z.infer<typeof SECTION_OUTPUT>;
async function changeSection(
  edit: SectionEdit,
  context: ChatToolContext,
): Promise<SectionOutput> {
  if (context.projectId === undefined) {
    return { status: "not-changed", reason: "not-found" };
  }
  const result = await writeSection(context.actingUser, {
    projectId: context.projectId,
    kind: edit.kind,
    author: "construct",
    edit,
  });
  if (result.status === "not-changed") {
    return {
      status: "not-changed",
      reason: result.reason,
      content: result.state?.content,
    };
  }
  const [newest] = result.state.history;
  if (newest === undefined) {
    return { status: "not-changed", reason: "not-found" };
  }
  return {
    status: "changed",
    projectId: result.projectId,
    version: newest.version,
    content: newest.content,
    before: newest.before,
  };
}

const setGoalTool = tool({
  description: SET_GOAL_DESCRIPTION,
  inputSchema: SET_GOAL_INPUT,
  outputSchema: SECTION_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: (
    input: z.infer<typeof SET_GOAL_INPUT>,
    { context }: { context: ChatToolContext },
  ): Promise<SectionOutput> =>
    changeSection({ kind: "goal", ...input }, context),
});
const changePreferencesTool = tool({
  description: CHANGE_PREFERENCES_DESCRIPTION,
  inputSchema: CHANGE_PREFERENCES_INPUT,
  outputSchema: SECTION_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: (
    input: z.infer<typeof CHANGE_PREFERENCES_INPUT>,
    { context }: { context: ChatToolContext },
  ): Promise<SectionOutput> =>
    changeSection({ kind: "preferences", ...input }, context),
});

export { changePreferencesTool, setGoalTool };
