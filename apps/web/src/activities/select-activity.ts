// The buddy's tool for changing its chat's current activity. It records a
// new activity session from the message the reply answers, and returns the
// activity's instructions, so the buddy follows them in the same reply. The
// interview needs a project's memory, so a chat with no project doesn't
// enter it: its instructions tell the buddy to start a project instead.
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
  const activity = await chosenActivity(context.owner, activityId);
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
    context.owner,
    context.chatId,
    activity,
    context.answeredId,
  );
  if (!entered) {
    // The reply's chat is read for its owner, so it is the owner's; a chat
    // that is not reads as not found, as everywhere else.
    throw new AppError(
      "not-found",
      new Error("No such chat to change the activity of"),
    );
  }
  return {
    status: "entered",
    activityId: activity.id,
    name: activity.name,
    instructions: activity.parts.instructions,
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
