// What the change_tasks tool takes and returns, shared by the tool and the
// part that shows each change in the chat. It imports nothing from the
// server, because the part in the browser imports it too.

import { z } from "zod";
import { QUEST_ID } from "@/ids.ts";
import {
  TASKS,
  TASKS_CHANGE_LINE,
  TASKS_FAILURES,
  TASKS_OPERATION,
} from "@/tasks/tasks.ts";

const CHANGE_TASKS_TOOL = "change_tasks";

// The most operations one call may make: enough to lay out the tasks at once.
const MOST_OPERATIONS = 40;

// The tool's description.
const CHANGE_TASKS_DESCRIPTION = [
  "Change the quest's Tasks: its remaining work, in order, shown in your instructions with their numbers, such as #3. The quest's page, the conversation's Tasks panel and the composer's commands show the same tasks, and the user changes them there too.",
  "Each call applies its operations in order, all or none, and saves one change that the user sees in the conversation and can undo: add a task, at the end or before another; change a task's text; complete a task the user finished; reopen one; move one before another or to the end; remove one.",
  "The first open task is the quest's next task, which the site shows the user.",
  "Name tasks by their numbers. If a task you name is gone, for example because the user changed the tasks meanwhile, nothing is saved and the result gives the tasks as they are now.",
].join(" ");

const CHANGE_TASKS_INPUT = z.object({
  operations: z
    .array(TASKS_OPERATION)
    .min(1)
    .max(MOST_OPERATIONS)
    .describe("The changes to make, in order."),
});

// The change the tool saved, with the tasks after it, or why it saved nothing,
// with the tasks as they are, so the construct can try again.
const CHANGE_TASKS_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("changed"),
    questId: QUEST_ID,
    version: z.number().int().positive(),
    lines: z.array(TASKS_CHANGE_LINE),
    tasks: TASKS,
  }),
  z.object({
    status: z.literal("not-changed"),
    reason: z.enum(TASKS_FAILURES),
    tasks: TASKS,
  }),
]);

type ChangeTasksInput = z.infer<typeof CHANGE_TASKS_INPUT>;
type ChangeTasksOutput = z.infer<typeof CHANGE_TASKS_OUTPUT>;

export type { ChangeTasksInput, ChangeTasksOutput };
export {
  CHANGE_TASKS_DESCRIPTION,
  CHANGE_TASKS_INPUT,
  CHANGE_TASKS_OUTPUT,
  CHANGE_TASKS_TOOL,
};
