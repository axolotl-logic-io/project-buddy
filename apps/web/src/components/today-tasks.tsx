"use client";

import {
  type JSX,
  startTransition,
  useCallback,
  useId,
  useOptimistic,
} from "react";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { TaskCheck } from "@/components/ui/task-check.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { RecurringTask } from "@/streaks/streak-store.ts";
import {
  type StreakChain,
  streakChains,
  type TaskHistory,
} from "@/streaks/streaks.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";

// One task checked off or unchecked today.
interface Check {
  readonly number: number;
  readonly done: boolean;
}

function checked(
  tasks: readonly RecurringTask[],
  change: Check,
): readonly RecurringTask[] {
  return tasks.map((task) => {
    if (task.number !== change.number) {
      return task;
    }
    return { ...task, done: change.done };
  });
}

function TodayTask({
  task,
  chain,
  onCheck,
}: {
  readonly task: RecurringTask;
  readonly chain: StreakChain | undefined;
  readonly onCheck: (change: Check) => void;
}): JSX.Element {
  const toggle = useCallback((): void => {
    onCheck({ number: task.number, done: !task.done });
  }, [onCheck, task.number, task.done]);
  const checkId = useId();
  return (
    <li className="quest-today-task">
      <label className="quest-today-check" htmlFor={checkId}>
        <TaskCheck checked={task.done} id={checkId} onChange={toggle} />
        <span className="wrap-anywhere">{task.text}</span>
      </label>
      {chain !== undefined && (
        <span className="quest-today-streak">
          {QUEST_OVERVIEW_COPY.streak(chain)}
        </span>
      )}
    </li>
  );
}

// The quest's recurring tasks for today, each with its streak, checked off
// or unchecked in place.
function TodayTasks({
  questId,
  history,
  tasks,
}: {
  readonly questId: QuestId;
  readonly history: TaskHistory;
  readonly tasks: readonly RecurringTask[];
}): JSX.Element {
  const headingId = useId();
  const [shown, showCheck] = useOptimistic(tasks, checked);
  const { run, status, problem } = useQuestAction(changeListItemAction);
  const onCheck = useCallback(
    (change: Check): void => {
      const task = tasks.find(({ number }) => number === change.number);
      if (task === undefined) {
        return;
      }
      startTransition(async () => {
        showCheck(change);
        await run({
          questId,
          listId: task.listId,
          change: { kind: "check", id: task.id, checkedOff: change.done },
        });
      });
    },
    [questId, run, showCheck, tasks],
  );
  const chains = streakChains(history, shown);
  return (
    <section aria-labelledby={headingId} className="quest-section-body">
      <h3 id={headingId} className="quest-overview-label">
        {QUEST_OVERVIEW_COPY.today}
      </h3>
      <ul className="quest-today">
        {shown.map((task) => (
          <TodayTask
            chain={chains.get(task.number)}
            key={task.id}
            onCheck={onCheck}
            task={task}
          />
        ))}
      </ul>
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{status}</FormStatus>
    </section>
  );
}

export { TodayTasks };
