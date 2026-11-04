import { tool } from "ai";
import { INTERVIEW_ACTIVITY_ID } from "@/activities/activity.ts";
import { enterActivity } from "@/activities/activity-sessions.ts";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import {
  SELECT_ACTIVITY_DESCRIPTION,
  SELECT_ACTIVITY_INPUT,
  SELECT_ACTIVITY_OUTPUT,
  type SelectActivityInput,
  type SelectActivityOutput,
} from "@/activities/select-activity-contract.ts";
import { AppError } from "@/errors/app-error.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";

async function selectActivity(
  { activityId }: SelectActivityInput,
  { context }: { context: ChatToolContext },
): Promise<SelectActivityOutput> {
  const activity = await chosenActivity(context.actingUser, activityId);
  if (activity === undefined) {
    return { status: "unknown" };
  }
  if (
    activity.id === INTERVIEW_ACTIVITY_ID &&
    context.projectId === undefined
  ) {
    return { status: "needsProject" };
  }
  const entered = await enterActivity(
    context.actingUser,
    context.chatId,
    activity,
    context.answeredId,
  );
  if (!entered) {
    throw new AppError(
      "not-found",
      new Error("No such chat to change the activity of"),
    );
  }
  return {
    status: "entered",
    activityId: activity.id,
    name: activity.name,
    instructions: activity.definition.prompt,
  };
}

const selectActivityTool = tool({
  description: SELECT_ACTIVITY_DESCRIPTION,
  inputSchema: SELECT_ACTIVITY_INPUT,
  outputSchema: SELECT_ACTIVITY_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: selectActivity,
});

export { selectActivityTool };
