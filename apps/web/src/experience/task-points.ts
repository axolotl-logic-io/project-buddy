import type { Tasks } from "@/tasks/tasks.ts";

// What a change to a quest's Tasks did that gains or loses points, by task
// number: the tasks it added, the open tasks it completed and the done tasks
// it reopened. A removed task keeps its points, and a restored one gains none
// again, since its number was given before.
interface TaskPointChanges {
  readonly added: readonly number[];
  readonly completed: readonly number[];
  readonly reopened: readonly number[];
}

function taskPointChanges(before: Tasks, after: Tasks): TaskPointChanges {
  const done = new Map(before.items.map((task) => [task.number, task.done]));
  const added: number[] = [];
  const completed: number[] = [];
  const reopened: number[] = [];
  for (const task of after.items) {
    const wasDone = done.get(task.number);
    if (wasDone === undefined) {
      if (task.number >= before.nextNumber) {
        added.push(task.number);
      }
    } else if (task.done && wasDone === false) {
      completed.push(task.number);
    } else if (!task.done && wasDone === true) {
      reopened.push(task.number);
    }
  }
  return { added, completed, reopened };
}

export type { TaskPointChanges };
export { taskPointChanges };
