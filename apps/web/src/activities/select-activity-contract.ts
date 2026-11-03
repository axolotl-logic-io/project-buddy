// What the select_activity tool takes and returns, shared by the tool and
// the part that shows the change in the chat. It imports nothing from the
// server, because the part in the browser imports it too.
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { z } from "zod";

const SELECT_ACTIVITY_TOOL = "select_activity";

// The tool's description.
const SELECT_ACTIVITY_DESCRIPTION = [
  "Change this chat's current activity to one of the activities in your instructions, by its id.",
  "Call it when the user asks for another activity, or when another one clearly suits what they want to do now.",
  "The result gives the new activity's instructions: follow them from then on, in this reply too. The chat shows the user the change.",
].join(" ");

const SELECT_ACTIVITY_INPUT = z.object({
  activityId: z
    .string()
    .describe(
      "The activity's id, exactly as your list of activities gives it.",
    ),
});

// The activity the chat entered, with its instructions, or why it entered
// none: the id is not one of the user's activities, or the activity needs a
// project, which this chat has none of. The instructions go to the model in
// the reply that entered the activity, and are never kept with the saved
// reply nor served from it (withoutActivityInstructions): what the chat
// shows, the activity's name, is all a saved result holds. The chat's
// current activity, and its instructions, live in its activity sessions.
const SELECT_ACTIVITY_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("entered"),
    activityId: z.string(),
    name: z.string(),
    instructions: z.string().optional(),
  }),
  z.object({ status: z.literal("unknown") }),
  z.object({ status: z.literal("needsProject") }),
]);

type SelectActivityInput = z.infer<typeof SELECT_ACTIVITY_INPUT>;
type SelectActivityOutput = z.infer<typeof SELECT_ACTIVITY_OUTPUT>;

// The message without the instructions of any activity select_activity
// entered in it, as a reply is saved and a chat's messages are read, so
// they reach no one but the model that entered it, whoever else the chat is
// open to. Every other part is left as it is.
function withoutActivityInstructions(message: UIMessage): UIMessage {
  return {
    ...message,
    parts: message.parts.map((part) => {
      if (
        !isToolUIPart(part) ||
        getToolName(part) !== SELECT_ACTIVITY_TOOL ||
        part.state !== "output-available"
      ) {
        return part;
      }
      const output = SELECT_ACTIVITY_OUTPUT.safeParse(part.output);
      if (!output.success || output.data.status !== "entered") {
        return part;
      }
      const { instructions: _instructions, ...kept } = output.data;
      return { ...part, output: kept };
    }),
  };
}

export type { SelectActivityInput, SelectActivityOutput };
export {
  SELECT_ACTIVITY_DESCRIPTION,
  SELECT_ACTIVITY_INPUT,
  SELECT_ACTIVITY_OUTPUT,
  SELECT_ACTIVITY_TOOL,
  withoutActivityInstructions,
};
