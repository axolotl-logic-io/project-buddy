import type { JSX } from "react";
import { TaskRows } from "@/components/tasks/task-rows.tsx";
import {
  type TasksActions,
  TasksContext,
  useTasksController,
} from "@/components/tasks/use-tasks.ts";
import type { QuestId } from "@/ids.ts";
import type { TasksState } from "@/tasks/tasks.ts";

// The tasks with every control to change them, as the quest's
// conversation shows them.
export function QuestTasks({
  questId,
  tasks,
  actions,
}: {
  readonly questId: QuestId;
  readonly tasks: TasksState;
  readonly actions: TasksActions;
}): JSX.Element {
  const controller = useTasksController({
    questId,
    actions,
    initialState: tasks,
  });
  return (
    <TasksContext.Provider value={controller}>
      <TaskRows />
    </TasksContext.Provider>
  );
}
