"use client";

import type { JSX, ReactNode } from "react";
import {
  type TasksActions,
  TasksContext,
  useTasksController,
} from "@/components/tasks/use-tasks.ts";
import type { DailiesDay } from "@/dailies/dailies.ts";
import type { QuestId } from "@/ids.ts";
import type { TasksState } from "@/tasks/tasks.ts";

function QuestTasks({
  questId,
  state,
  days,
  actions,
  children,
}: {
  readonly questId: QuestId;
  readonly state: TasksState | undefined;
  readonly days: readonly DailiesDay[] | undefined;
  readonly actions: TasksActions;
  readonly children: ReactNode;
}): JSX.Element {
  const tasks = useTasksController({
    questId,
    actions,
    initialState: state,
    days,
  });
  return (
    <TasksContext.Provider value={tasks}>{children}</TasksContext.Provider>
  );
}

export { QuestTasks };
