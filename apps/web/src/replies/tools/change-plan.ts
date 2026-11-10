// The construct's tool for changing its chat's project's plan, from the chat
// it is changed in.
import { tool } from "ai";
import { AppError } from "@/errors/app-error.ts";
import { changePlan } from "@/plan/plan-store.ts";
import {
  CHANGE_PLAN_DESCRIPTION,
  CHANGE_PLAN_INPUT,
  CHANGE_PLAN_OUTPUT,
  type ChangePlanInput,
  type ChangePlanOutput,
} from "@/replies/tools/change-plan-contract.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";

async function changeChatPlan(
  { operations }: ChangePlanInput,
  { context }: { context: ChatToolContext },
): Promise<ChangePlanOutput> {
  // A standalone chat has no project and so no plan: tools/index.ts never
  // offers it this tool.
  const { projectId } = context;
  if (projectId === undefined) {
    throw new AppError(
      "not-found",
      new Error("No project whose plan to change from a standalone chat"),
    );
  }
  const outcome = await changePlan(
    context.actingUser,
    { projectId, chatId: context.chatId, author: "construct" },
    operations,
  );
  if (outcome === undefined) {
    // The reply's chat is read for its acting user, so its project is the
    // acting user's; a project that is not reads as not found, as
    // everywhere else.
    throw new AppError(
      "not-found",
      new Error("No such project whose plan to change"),
    );
  }
  if (outcome.kind === "failed") {
    let { reason } = outcome;
    if (reason === "already-undone" || reason === "no-such-change") {
      reason = "unchanged";
    }
    return { status: "not-changed", reason, plan: outcome.state.plan };
  }
  return {
    status: "changed",
    projectId,
    version: outcome.change.version,
    lines: [...outcome.change.lines],
    plan: outcome.state.plan,
  };
}

const changePlanTool = tool({
  description: CHANGE_PLAN_DESCRIPTION,
  inputSchema: CHANGE_PLAN_INPUT,
  outputSchema: CHANGE_PLAN_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: changeChatPlan,
});

export { changePlanTool };
