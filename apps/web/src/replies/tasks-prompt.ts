// The prompt section that gives every chat in a quest the quest's tasks,
// as the prompt read it when the turn started, between tags: each step on a
// line of its own, with the number change_tasks names it by.

import type { ReplyPromptContext } from "@/replies/system-prompt.ts";
import { CHANGE_TASKS_TOOL } from "@/replies/tools/change-tasks-contract.ts";
import { nextTasksStep, type Tasks, type TasksStep } from "@/tasks/tasks.ts";

// The line the prompt gives while the tasks have no steps.
const EMPTY_TASKS_PROMPT = `The quest's tasks have no steps yet. When the user agrees on what to do next, add the steps with \`${CHANGE_TASKS_TOOL}\`.`;

// The line before the tasks.
const TASKS_PROMPT_INTRO =
  "The quest's tasks: its steps of remaining work, in order, each with its number. Done steps are marked [done]. The first open step is the quest's next step. The user can change the tasks without you, so this is the tasks as they are now:";

const TASKS_START_TAG = "<quest_tasks>";
const TASKS_END_TAG = "</quest_tasks>";

function stepLine({ number, text, done }: TasksStep): string {
  if (done) {
    return `#${number} [done] ${text}`;
  }
  return `#${number} ${text}`;
}

// The task list's steps as the prompt gives them.
function tasksLines(tasks: Tasks): string[] {
  return tasks.steps.map(stepLine);
}

// The quest's tasks, between tags that keep it apart from the rest of the
// prompt.
function tasksPromptSection({ quest }: ReplyPromptContext): string {
  if (quest.tasks.steps.length === 0) {
    return EMPTY_TASKS_PROMPT;
  }
  const next = nextTasksStep(quest.tasks);
  const lines = [
    TASKS_PROMPT_INTRO,
    TASKS_START_TAG,
    ...tasksLines(quest.tasks),
    TASKS_END_TAG,
  ];
  if (next === undefined) {
    lines.push("Every step is done.");
  }
  return lines.join("\n");
}

export { tasksPromptSection };
