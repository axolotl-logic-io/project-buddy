// The construct's tool for adding a milestone to its chat's quest's progress
// timeline, from the chat it is recorded in.

import { tool } from "ai";
import { AppError } from "@/errors/app-error.ts";
import { recordMilestone } from "@/milestones/milestone-store.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";
import {
  RECORD_MILESTONE_DESCRIPTION,
  RECORD_MILESTONE_INPUT,
  RECORD_MILESTONE_OUTPUT,
  type RecordMilestoneInput,
  type RecordMilestoneOutput,
} from "@/replies/tools/record-milestone-contract.ts";

async function recordChatMilestone(
  { text }: RecordMilestoneInput,
  { context }: { context: ChatToolContext },
): Promise<RecordMilestoneOutput> {
  // A standalone chat has no quest and so no timeline: tools/index.ts
  // never offers it this tool.
  const { questId } = context;
  if (questId === undefined) {
    throw new AppError(
      "not-found",
      new Error("No quest to record a milestone in from a standalone chat"),
    );
  }
  const milestone = await recordMilestone(
    context.actingUser,
    { questId, chatId: context.chatId },
    text,
  );
  if (milestone === undefined) {
    // The reply's chat is read for its acting user, so its quest is the acting user's;
    // a quest that is not reads as not found, as everywhere else.
    throw new AppError(
      "not-found",
      new Error("No such quest to record a milestone in"),
    );
  }
  return {
    status: "recorded",
    milestoneId: milestone.id,
    questId,
    text: milestone.text,
    recordedAt: milestone.recordedAt.toISOString(),
  };
}

const recordMilestoneTool = tool({
  description: RECORD_MILESTONE_DESCRIPTION,
  inputSchema: RECORD_MILESTONE_INPUT,
  outputSchema: RECORD_MILESTONE_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: recordChatMilestone,
});

export { recordMilestoneTool };
