"use client";

import Link from "next/link";
import {
  type JSX,
  type RefObject,
  useCallback,
  useId,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { keepFocus } from "@/components/keep-focus.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { NoticeSlot } from "@/components/ui/notice-slot.tsx";
import { TaskCheck } from "@/components/ui/task-check.tsx";
import {
  type QuestAction,
  useQuestAction,
} from "@/components/use-quest-action.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { OneOffTask, TaskQuest } from "@/tasks/task-store.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";

// The task checked off last, where it was, so Undo can uncheck it and
// bring it back to its place.
interface CheckedOff {
  readonly quest: TaskQuest["quest"];
  readonly task: OneOffTask;
  readonly questAt: number;
  readonly taskAt: number;
}

// A change to the tasks shown, made before the server replies.
type TasksChange = (quests: readonly TaskQuest[]) => readonly TaskQuest[];

function changeTasks(
  quests: readonly TaskQuest[],
  change: TasksChange,
): readonly TaskQuest[] {
  return change(quests);
}

// The quests without a task that was just checked off, and without a
// quest left with no task.
function without(
  quests: readonly TaskQuest[],
  id: ListItemId,
): readonly TaskQuest[] {
  return quests
    .map((entry) => ({
      ...entry,
      tasks: entry.tasks.filter((task) => task.id !== id),
    }))
    .filter(({ tasks }) => tasks.length > 0);
}

// The quests with a task that was checked off back in its place.
function withTask(
  quests: readonly TaskQuest[],
  { quest, task, questAt, taskAt }: CheckedOff,
): readonly TaskQuest[] {
  const entry = quests.find((each) => each.quest.id === quest.id);
  if (entry === undefined) {
    return quests.toSpliced(questAt, 0, { quest, tasks: [task] });
  }
  return quests.map((each) => {
    if (each !== entry) {
      return each;
    }
    return { ...each, tasks: each.tasks.toSpliced(taskAt, 0, task) };
  });
}

function HomeTask({
  task,
  onCheck,
}: {
  readonly task: OneOffTask;
  readonly onCheck: (id: ListItemId) => void;
}): JSX.Element {
  const check = useCallback((): void => {
    onCheck(task.id);
  }, [onCheck, task.id]);
  const checkId = useId();
  return (
    <li className="quest-today-task">
      <label className="quest-today-check" htmlFor={checkId}>
        <TaskCheck checked={false} id={checkId} onChange={check} />
        <span className="wrap-anywhere">{task.text}</span>
      </label>
    </li>
  );
}

// One quest's open one-off tasks under a link to the quest.
function QuestTasks({
  entry,
  onCheck,
}: {
  readonly entry: TaskQuest;
  readonly onCheck: (id: ListItemId) => void;
}): JSX.Element {
  const { quest, tasks } = entry;
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h3 className="home-task-quest" id={headingId}>
        <Link className="text-link" href={`/quests/${quest.id}`}>
          {quest.name}
        </Link>{" "}
        <span className="font-normal text-muted text-sm">
          {HOME_COPY.openCount(tasks.length)}
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

function useUndo(
  start: QuestAction<unknown>["start"],
  showTasks: (change: TasksChange) => void,
  headingRef: RefObject<HTMLHeadingElement | null>,
): {
  readonly checkedOff: CheckedOff | undefined;
  readonly checkOff: (task: CheckedOff) => void;
  readonly undo: () => void;
} {
  const [settled, setCheckedOff] = useState<CheckedOff | undefined>(undefined);
  const [checkedOff, showCheckedOff] = useOptimistic(settled);
  const checkOff = useCallback(
    (target: CheckedOff): void => {
      const { quest, task } = target;
      start(
        {
          questId: quest.id,
          listId: task.listId,
          change: { kind: "check", id: task.id, checkedOff: true },
        },
        {
          status: LISTS_COPY.checkedOff,
          show: (): void => {
            showTasks((quests) => without(quests, task.id));
            showCheckedOff(target);
          },
          keep: (): void => setCheckedOff(target),
        },
      );
    },
    [start, showTasks, showCheckedOff],
  );
  const undo = useCallback((): void => {
    if (checkedOff === undefined) {
      return;
    }
    const { quest, task } = checkedOff;
    headingRef.current?.focus();
    start(
      {
        questId: quest.id,
        listId: task.listId,
        change: { kind: "check", id: task.id, checkedOff: false },
      },
      {
        status: LISTS_COPY.unchecked,
        show: (): void => {
          showTasks((quests) => withTask(quests, checkedOff));
          showCheckedOff(undefined);
        },
        keep: (): void => setCheckedOff(undefined),
      },
    );
  }, [checkedOff, headingRef, start, showTasks, showCheckedOff]);
  return { checkedOff, checkOff, undo };
}

// The open one-off tasks of the user's Active quests, grouped by quest. A
// task checked off here leaves at once, and Undo brings it back.
function HomeTasks({
  quests,
}: {
  readonly quests: readonly TaskQuest[];
}): JSX.Element {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [shown, showTasks] = useOptimistic(quests, changeTasks);
  const { start, status, problem } = useQuestAction(changeListItemAction);
  const { checkedOff, checkOff, undo } = useUndo(start, showTasks, headingRef);
  const onCheck = useCallback(
    (id: ListItemId): void => {
      const questAt = shown.findIndex(({ tasks }) =>
        tasks.some((each) => each.id === id),
      );
      const entry = shown[questAt];
      const taskAt = entry?.tasks.findIndex((each) => each.id === id) ?? -1;
      const task = entry?.tasks[taskAt];
      if (entry === undefined || task === undefined) {
        return;
      }
      keepFocus(sectionRef.current, headingRef.current);
      checkOff({ quest: entry.quest, task, questAt, taskAt });
    },
    [shown, checkOff],
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
    <section
      aria-labelledby={headingId}
      className="streak-panel"
      ref={sectionRef}
    >
      <h2
        className="section-heading"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
      >
        {HOME_COPY.tasksHeading}
      </h2>
      <NoticeSlot>
        {body}
        {problem !== undefined && <Alert>{problem}</Alert>}
        <FormStatus>{status}</FormStatus>
        {checkedOff !== undefined && (
          <Button onClick={undo} variant="quiet">
            {LISTS_COPY.undo}
          </Button>
        )}
      </NoticeSlot>
    </section>
  );
}

export { HomeTasks };
