import type { JSX } from "react";
import { TasksSteps } from "@/components/tasks/tasks-steps.tsx";
import {
  type TasksActions,
  TasksContext,
  useTasksController,
} from "@/components/tasks/use-tasks.ts";
import type { DailiesDay } from "@/dailies/dailies.ts";
import type { QuestId } from "@/ids.ts";
import type { TasksState } from "@/tasks/tasks.ts";

// The task list's steps with every control to change them, as the quest's
// conversation shows them; with days, as the Dailies quest shows them.
export function QuestTasks({
  questId,
  tasks,
  actions,
  days,
}: {
  readonly questId: QuestId;
  readonly tasks: TasksState;
  readonly actions: TasksActions;
  readonly days?: readonly DailiesDay[];
}): JSX.Element {
  const controller = useTasksController({
    questId,
    actions,
    initialState: tasks,
    ...(days !== undefined && { days }),
  });
  return (
    <TasksContext.Provider value={controller}>
      <TasksSteps />
    </TasksContext.Provider>
  );
}
