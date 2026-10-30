// What the select_activity tool takes and returns, shared by the tool and
// the part that shows the change in the chat. It imports nothing from the
// server, because the part in the browser imports it too.
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
// project, which this chat has none of.
const SELECT_ACTIVITY_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("entered"),
    activityId: z.string(),
    name: z.string(),
    instructions: z.string(),
  }),
  z.object({ status: z.literal("unknown") }),
  z.object({ status: z.literal("needsProject") }),
]);

type SelectActivityInput = z.infer<typeof SELECT_ACTIVITY_INPUT>;
type SelectActivityOutput = z.infer<typeof SELECT_ACTIVITY_OUTPUT>;

export type { SelectActivityInput, SelectActivityOutput };
export {
  SELECT_ACTIVITY_DESCRIPTION,
  SELECT_ACTIVITY_INPUT,
  SELECT_ACTIVITY_OUTPUT,
  SELECT_ACTIVITY_TOOL,
};
