// The construct's tool for changing its chat's quest's tasks, from the chat
// it is changed in.

import { tool } from "ai";
import { AppError } from "@/errors/app-error.ts";
import {
  CHANGE_TASKS_DESCRIPTION,
  CHANGE_TASKS_INPUT,
  CHANGE_TASKS_OUTPUT,
  type ChangeTasksInput,
  type ChangeTasksOutput,
} from "@/replies/tools/change-tasks-contract.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";
import type { TasksFailure } from "@/tasks/tasks.ts";
import { changeTasks } from "@/tasks/tasks-store.ts";

async function changeChatTasks(
  { operations }: ChangeTasksInput,
  { context }: { context: ChatToolContext },
): Promise<ChangeTasksOutput> {
  const { questId } = context;
  const outcome = await changeTasks(
    context.actingUser,
    { questId, chatId: context.chatId, author: "construct" },
    operations,
  );
  if (outcome === undefined) {
    // The reply's chat is read for its acting user, so its quest is the
    // acting user's; a quest that is not reads as not found, as
    // everywhere else.
    throw new AppError(
      "not-found",
      new Error("No such quest whose tasks to change"),
    );
  }
  if (outcome.kind === "failed") {
    // The construct's changes are no undos and wait for no reply, so any
    // other reason reads as the tasks unchanged.
    const { reason: found } = outcome;
    let reason: TasksFailure = "unchanged";
    if (found === "missing-task") {
      reason = found;
    }
    return { status: "not-changed", reason, tasks: outcome.state.tasks };
  }
  return {
    status: "changed",
    questId,
    version: outcome.change.version,
    lines: [...outcome.change.lines],
    tasks: outcome.state.tasks,
  };
}

const changeTasksTool = tool({
  description: CHANGE_TASKS_DESCRIPTION,
  inputSchema: CHANGE_TASKS_INPUT,
  outputSchema: CHANGE_TASKS_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: changeChatTasks,
});

export { changeTasksTool };
