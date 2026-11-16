// The prompt section that gives every chat in a quest the quest's tasks,
// as the prompt read it when the turn started, between tags: each task on a
// line of its own, with the number change_tasks names it by.

import type { ReplyPromptContext } from "@/replies/system-prompt.ts";
import { CHANGE_TASKS_TOOL } from "@/replies/tools/change-tasks-contract.ts";
import { nextTask, type Task, type Tasks } from "@/tasks/tasks.ts";

// The line the prompt gives while the quest has no tasks.
const EMPTY_TASKS_PROMPT = `The quest has no tasks yet. When the user agrees on what to do next, add them with \`${CHANGE_TASKS_TOOL}\`.`;

// The line before the tasks.
const TASKS_PROMPT_INTRO =
  "The quest's Tasks: its remaining work, in order, each with its number. Done tasks are marked [done], and recurring tasks, which Start Day reopens each day, [recurring]. The first open task is the quest's next task. The user can change the tasks without you, so this is the tasks as they are now:";

const TASKS_START_TAG = "<quest_tasks>";
const TASKS_END_TAG = "</quest_tasks>";

function taskLine({ number, text, done, recurring }: Task): string {
  const marks: string[] = [];
  if (done) {
    marks.push("[done]");
  }
  if (recurring === true) {
    marks.push("[recurring]");
  }
  return [`#${number}`, ...marks, text].join(" ");
}

// The tasks as the prompt gives them.
function tasksLines(tasks: Tasks): string[] {
  return tasks.items.map(taskLine);
}

// The quest's tasks, between tags that keep it apart from the rest of the
// prompt.
function tasksPromptSection({ quest }: ReplyPromptContext): string {
  if (quest.tasks.items.length === 0) {
    return EMPTY_TASKS_PROMPT;
  }
  const next = nextTask(quest.tasks);
  const lines = [
    TASKS_PROMPT_INTRO,
    TASKS_START_TAG,
    ...tasksLines(quest.tasks),
    TASKS_END_TAG,
  ];
  if (next === undefined) {
    lines.push("Every task is done.");
  }
  return lines.join("\n");
}

export { tasksPromptSection };
