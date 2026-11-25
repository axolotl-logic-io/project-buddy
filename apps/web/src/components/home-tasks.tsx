"use client";

import Link from "next/link";
import {
  type JSX,
  startTransition,
  useCallback,
  useId,
  useOptimistic,
} from "react";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { OneOffTask, TaskQuest } from "@/tasks/task-store.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

// One task checked off or unchecked.
interface Check {
  readonly id: ListItemId;
  readonly done: boolean;
}

function checked(
  quests: readonly TaskQuest[],
  change: Check,
): readonly TaskQuest[] {
  return quests.map((entry) => ({
    ...entry,
    tasks: entry.tasks.map((task) => {
      if (task.id !== change.id) {
        return task;
      }
      return { ...task, done: change.done };
    }),
  }));
}

function HomeTask({
  task,
  onCheck,
}: {
  readonly task: OneOffTask;
  readonly onCheck: (change: Check) => void;
}): JSX.Element {
  const toggle = useCallback((): void => {
    onCheck({ id: task.id, done: !task.done });
  }, [onCheck, task.id, task.done]);
  return (
    <li className="quest-today-task">
      <label className="quest-today-check">
        <span className="editable-check">
          <input type="checkbox" checked={task.done} onChange={toggle} />
        </span>
        <span className="wrap-anywhere">{task.text}</span>
      </label>
    </li>
  );
}

// One quest's one-off tasks under a link to the quest.
function QuestTasks({
  entry,
  onCheck,
}: {
  readonly entry: TaskQuest;
  readonly onCheck: (change: Check) => void;
}): JSX.Element {
  const { quest, tasks } = entry;
  const headingId = useId();
  const open = tasks.filter(({ done }) => !done).length;
  return (
    <section aria-labelledby={headingId}>
      <h3 className="home-task-quest" id={headingId}>
        <Link className="text-link" href={`/quests/${quest.id}`}>
          {quest.name}
        </Link>{" "}
        <span className="font-normal text-muted text-sm">
          {HOME_COPY.openCount(open)}
        </span>
      </h3>
      <ul className="quest-today">
        {tasks.map((task) => (
          <HomeTask key={task.id} onCheck={onCheck} task={task} />
        ))}
      </ul>
    </section>
  );
}

// The one-off tasks of the user's Active quests, grouped by quest: each
// open one, and each checked off on its quest's today, checked off or
// unchecked in place.
function HomeTasks({
  quests,
}: {
  readonly quests: readonly TaskQuest[];
}): JSX.Element {
  const headingId = useId();
  const [shown, showCheck] = useOptimistic(quests, checked);
  const { run, status, problem } = useQuestAction(changeListItemAction);
  const onCheck = useCallback(
    (change: Check): void => {
      const entry = quests.find(({ tasks }) =>
        tasks.some(({ id }) => id === change.id),
      );
      const task = entry?.tasks.find(({ id }) => id === change.id);
      if (entry === undefined || task === undefined) {
        return;
      }
      startTransition(async () => {
        showCheck(change);
        await run({
          questId: entry.quest.id,
          listId: task.listId,
          change: { kind: "check", id: task.id, checkedOff: change.done },
        });
      });
    },
    [quests, run, showCheck],
  );

  let body: JSX.Element;
  if (shown.length === 0) {
    body = <p className="text-muted text-sm">{HOME_COPY.noTasks}</p>;
  } else {
    body = (
      <>
        {shown.map((entry) => (
          <QuestTasks entry={entry} key={entry.quest.id} onCheck={onCheck} />
        ))}
        <p className="text-muted text-sm">{HOME_COPY.tasksLegend}</p>
      </>
    );
  }
  return (
    <section aria-labelledby={headingId} className="streak-panel">
      <h2 className="section-heading" id={headingId}>
        {HOME_COPY.tasksHeading}
      </h2>
      {body}
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{status}</FormStatus>
    </section>
  );
}

export { HomeTasks };
