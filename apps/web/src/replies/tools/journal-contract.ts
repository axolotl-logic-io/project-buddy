import { z } from "zod";
import { PROJECT_ID } from "@/ids.ts";
import { CONTENT, GOAL, PREFERENCE_OPERATION } from "@/journal/journal.ts";

const SET_GOAL_TOOL = "set_goal";
const CHANGE_PREFERENCES_TOOL = "change_preferences";
const SET_GOAL_INPUT = z.object({
  text: GOAL.describe("The agreed goal; empty to clear it."),
});
const MOST_OPERATIONS = 40;
const CHANGE_PREFERENCES_INPUT = z.object({
  operations: z.array(PREFERENCE_OPERATION).min(1).max(MOST_OPERATIONS),
});
const SECTION_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("changed"),
    projectId: PROJECT_ID,
    version: z.number().int().positive(),
    content: CONTENT,
    before: CONTENT,
  }),
  z.object({
    status: z.literal("not-changed"),
    reason: z.string(),
    content: CONTENT.optional(),
  }),
]);
const SET_GOAL_DESCRIPTION =
  "Set the quest's typed Goal to what the user agreed, using set_goal rather than update_memory. Read the current Goal in your instructions. A proposal stays in the conversation until agreed. Empty text clears the goal. The change is versioned and the user can undo it.";
const CHANGE_PREFERENCES_DESCRIPTION =
  "Change the quest's typed Preferences with add, change, move and remove operations. Read current preference numbers in your instructions; numbers stay stable. Record only preferences the user states or agrees to, never inferred preferences. Use this tool rather than update_memory. The batch applies all or none and the user can undo it.";

export {
  CHANGE_PREFERENCES_DESCRIPTION,
  CHANGE_PREFERENCES_INPUT,
  CHANGE_PREFERENCES_TOOL,
  SECTION_OUTPUT,
  SET_GOAL_DESCRIPTION,
  SET_GOAL_INPUT,
  SET_GOAL_TOOL,
};
