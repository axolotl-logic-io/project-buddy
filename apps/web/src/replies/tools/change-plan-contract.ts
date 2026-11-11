// What the change_plan tool takes and returns, shared by the tool and the
// part that shows each change in the chat. It imports nothing from the
// server, because the part in the browser imports it too.
import { z } from "zod";
import { PROJECT_ID } from "@/ids.ts";
import {
  PLAN,
  PLAN_CHANGE_LINE,
  PLAN_FAILURES,
  PLAN_OPERATION,
} from "@/plan/plan.ts";

const CHANGE_PLAN_TOOL = "change_plan";

// The most operations one call may make: enough to lay out a plan at once.
const MOST_OPERATIONS = 40;

// The tool's description.
const CHANGE_PLAN_DESCRIPTION = [
  "Change the quest's plan: its ordered steps of remaining work, shown in your instructions with their numbers, such as #3. The quest's page, the conversation's Plan panel and the composer's commands show the same plan, and the user changes it there too.",
  "Each call applies its operations in order, all or none, and saves one change that the user sees in the conversation and can undo: add a step, at the end or before another; change a step's text; complete a step the user finished; reopen one; move one before another or to the end; remove one.",
  "The first open step is the quest's next step, which the site shows the user.",
  "Name steps by their numbers. If a step you name is gone, for example because the user changed the plan meanwhile, nothing is saved and the result gives the plan as it is now.",
].join(" ");

const CHANGE_PLAN_INPUT = z.object({
  operations: z
    .array(PLAN_OPERATION)
    .min(1)
    .max(MOST_OPERATIONS)
    .describe("The changes to make, in order."),
});

// The change the tool saved, with the plan after it, or why it saved nothing,
// with the plan as it is, so the construct can try again.
const CHANGE_PLAN_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("changed"),
    projectId: PROJECT_ID,
    version: z.number().int().positive(),
    lines: z.array(PLAN_CHANGE_LINE),
    plan: PLAN,
  }),
  z.object({
    status: z.literal("not-changed"),
    reason: z.enum(PLAN_FAILURES),
    plan: PLAN,
  }),
]);

type ChangePlanInput = z.infer<typeof CHANGE_PLAN_INPUT>;
type ChangePlanOutput = z.infer<typeof CHANGE_PLAN_OUTPUT>;

export type { ChangePlanInput, ChangePlanOutput };
export {
  CHANGE_PLAN_DESCRIPTION,
  CHANGE_PLAN_INPUT,
  CHANGE_PLAN_OUTPUT,
  CHANGE_PLAN_TOOL,
};
