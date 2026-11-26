"use client";

import Link from "next/link";
import {
  type JSX,
  type RefObject,
  startTransition,
  useCallback,
  useId,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { keepFocus } from "@/components/keep-focus.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { TaskCheck } from "@/components/ui/task-check.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { OneOffTask, TaskQuest } from "@/tasks/task-store.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";

// The task checked off last, so Undo can uncheck it.
interface CheckedOff {
  readonly questId: QuestId;
  readonly listId: ListId;
  readonly id: ListItemId;
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
  run: (request: unknown) => Promise<boolean>,
  headingRef: RefObject<HTMLHeadingElement | null>,
): {
  readonly checkedOff: CheckedOff | undefined;
  readonly setCheckedOff: (task: CheckedOff | undefined) => void;
  readonly undo: () => void;
} {
  const [checkedOff, setCheckedOff] = useState<CheckedOff | undefined>(
    undefined,
  );
  const undo = useCallback((): void => {
    if (checkedOff === undefined) {
      return;
    }
    const { questId, listId, id } = checkedOff;
    setCheckedOff(undefined);
    // Undo leaves with its notice.
    headingRef.current?.focus();
    startTransition(async () => {
      await run({
        questId,
        listId,
        change: { kind: "check", id, checkedOff: false },
      });
    });
  }, [checkedOff, headingRef, run]);
  return { checkedOff, setCheckedOff, undo };
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
  const [shown, hide] = useOptimistic(quests, without);
  const { run, busy, status, problem } = useQuestAction(changeListItemAction);
  const { checkedOff, setCheckedOff, undo } = useUndo(run, headingRef);
  const onCheck = useCallback(
    (id: ListItemId): void => {
      const entry = quests.find(({ tasks }) =>
        tasks.some((each) => each.id === id),
      );
      const task = entry?.tasks.find((each) => each.id === id);
      if (entry === undefined || task === undefined) {
        return;
      }
      const target = {
        questId: entry.quest.id,
        listId: task.listId,
        id: task.id,
      };
      keepFocus(sectionRef.current, headingRef.current);
      setCheckedOff(undefined);
      startTransition(async () => {
        hide(id);
        const saved = await run({
          questId: target.questId,
          listId: target.listId,
          change: { kind: "check", id, checkedOff: true },
        });
        if (saved) {
          setCheckedOff(target);
        }
      });
    },
    [quests, run, hide, setCheckedOff],
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
      {body}
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{status}</FormStatus>
      {checkedOff !== undefined && (
        <Button disabled={busy} onClick={undo} variant="quiet">
          {LISTS_COPY.undo}
        </Button>
      )}
    </section>
  );
}

export { HomeTasks };
