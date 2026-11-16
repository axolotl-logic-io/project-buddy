// How the Tasks routes answer: with the tasks in saved order and the Tasks
// version, after a change as before one.
import { apiItems, apiNotFound, apiProblem } from "@/api/api-route.ts";
import type { TasksState } from "@/tasks/tasks.ts";
import type { TasksChangeOutcome } from "@/tasks/tasks-store.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";

// The tasks, numbered as their commands name them, and the version.
function tasksItems(state: TasksState): Response {
  return apiItems(state.tasks.items, { version: state.version });
}

// A change's outcome: the tasks after it, with the change's lines, or why
// it saved nothing. A task that doesn't exist is not found; anything else
// that saved nothing, such as a change already undone, is a conflict.
function tasksAnswer(outcome: TasksChangeOutcome): Response {
  if (outcome === undefined) {
    return apiNotFound();
  }
  if (outcome.kind === "failed") {
    const message = TASKS_COPY.failed[outcome.reason];
    if (outcome.reason === "missing-task") {
      return apiProblem("not_found", message, "task");
    }
    return apiProblem("conflict", message);
  }
  return apiItems(outcome.state.tasks.items, {
    version: outcome.state.version,
    change: {
      version: outcome.change.version,
      lines: outcome.change.lines,
      undoesVersion: outcome.change.undoesVersion,
    },
  });
}

export { tasksAnswer, tasksItems };
