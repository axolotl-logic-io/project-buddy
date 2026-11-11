import { tool } from "ai";
import { AppError } from "@/errors/app-error.ts";
import type { QuestStatus, StatusApproval } from "@/projects/quest-status.ts";
import { requestQuestStatus } from "@/projects/quest-status-store.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";
import {
  QUEST_STATUS_DESCRIPTION,
  QUEST_STATUS_INPUT,
  QUEST_STATUS_OUTPUT,
} from "@/replies/tools/quest-status-contract.ts";

async function proposeStatus(
  { status }: { readonly status: QuestStatus },
  { context }: { readonly context: ChatToolContext },
): Promise<{ status: "awaiting-approval"; approval: StatusApproval }> {
  if (context.projectId === undefined) {
    throw new AppError("not-found", new Error("Chat has no quest status"));
  }
  const approval = await requestQuestStatus(
    context.actingUser,
    context.chatId,
    context.projectId,
    status,
  );
  if (approval === undefined) {
    throw new AppError(
      "not-found",
      new Error("No owner quest status change available"),
    );
  }
  return { status: "awaiting-approval", approval };
}

const questStatusTool = tool({
  description: QUEST_STATUS_DESCRIPTION,
  inputSchema: QUEST_STATUS_INPUT,
  outputSchema: QUEST_STATUS_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: proposeStatus,
});

export { questStatusTool };
