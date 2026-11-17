"use client";

import { type JSX, type ReactNode, useCallback, useMemo } from "react";
import {
  type TasksController,
  useTasks,
} from "@/components/tasks/use-tasks.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  AddListItem,
  EditableList,
  EditableListAction,
  EditableListRow,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { type StreakChain, streakChains } from "@/dailies/dailies.ts";
import {
  doneTasks,
  moveAmongOpen,
  openTasks,
  TASK_TEXT,
  TASK_TEXT_MAX_LENGTH,
  type Task,
} from "@/tasks/tasks.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";

function checkedText(text: string): { text: string } | { problem: string } {
  const parsed = TASK_TEXT.safeParse(text);
  if (parsed.success) {
    return { text: parsed.data };
  }
  if (text.trim() === "") {
    return { problem: TASKS_COPY.needsText };
  }
  return { problem: TASKS_COPY.tooLong(TASK_TEXT_MAX_LENGTH) };
}

const TASK_EDITOR: EditorOptions = {
  label: TASKS_COPY.textLabel,
  save: TASKS_COPY.save,
  cancel: TASKS_COPY.cancel,
  placeholder: TASKS_COPY.addPlaceholder,
  maxLength: TASK_TEXT_MAX_LENGTH,
  validate: checkedText,
};
const ADD_EDITOR: EditorOptions = {
  ...TASK_EDITOR,
  label: TASKS_COPY.addLabel,
  save: TASKS_COPY.add,
};

const NO_CHAINS: ReadonlyMap<number, StreakChain> = new Map();

// A recurring task's badge in the Dailies quest: the repeat icon, which
// says whether the task has a streak chain yet; nothing for a one-off task.
function recurringBadge(task: Task, chain: StreakChain | undefined): ReactNode {
  if (task.recurring !== true) {
    return null;
  }
  let label: string = TASKS_COPY.recurring;
  if (chain === undefined) {
    label = TASKS_COPY.recurringNoStreak;
  }
  return (
    <span className="editable-badge" title={label}>
      <Icon name="repeat" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

// What a link of a streak chain stands for: a day of the streak before the
// current day, the current day, open or done, a day still to come, or the
// milestone at the chain's end.
type LinkKind = "earned" | "today" | "milestone" | "ahead";

function linkKind(chain: StreakChain, index: number): LinkKind {
  if (index < chain.earned) {
    return "earned";
  }
  if (index === chain.earned) {
    if (chain.doneToday) {
      return "earned";
    }
    return "today";
  }
  if (index === chain.links - 1) {
    return "milestone";
  }
  return "ahead";
}

// A recurring task's streak chain, under its text: the links toward its
// next milestone, which screen readers skip, and the line that says them.
function StreakChainLine({
  chain,
}: {
  readonly chain: StreakChain;
}): JSX.Element {
  const links = Array.from({ length: chain.links }, (_, index) => index);
  return (
    <span className="streak-chain">
      <span className="streak-links" aria-hidden="true">
        {links.map((index) => (
          <span
            key={index}
            className="streak-link"
            data-link={linkKind(chain, index)}
          />
        ))}
      </span>
      <span className="streak-note">{TASKS_COPY.streakNote(chain)}</span>
    </span>
  );
}

// One task's row. In the Dailies quest (dailies), its menu makes it
// recurring or one-off, and a recurring task shows its streak chain.
function TaskRow({
  tasks,
  task,
  first,
  last,
  disabled,
  dailies,
  chain,
}: {
  readonly tasks: TasksController;
  readonly task: Task;
  readonly first: boolean;
  readonly last: boolean;
  readonly disabled: boolean;
  readonly dailies: boolean;
  readonly chain: StreakChain | undefined;
}): JSX.Element {
  const { change } = tasks;
  const toggle = useCallback(async (): Promise<void> => {
    if (task.done) {
      await change([{ op: "reopen", task: task.number }]);
    } else {
      await change([{ op: "complete", task: task.number }]);
    }
  }, [change, task]);
  const save = useCallback(
    (text: string): Promise<boolean> =>
      change([{ op: "change", task: task.number, text }]),
    [change, task.number],
  );
  const move = useCallback(
    async (direction: "up" | "down"): Promise<void> => {
      const operation = moveAmongOpen(
        tasks.state.tasks,
        task.number,
        direction,
      );
      if (operation !== undefined) {
        await change([operation]);
      }
    },
    [change, tasks.state.tasks, task.number],
  );
  const moveUp = useCallback((): Promise<void> => move("up"), [move]);
  const moveDown = useCallback((): Promise<void> => move("down"), [move]);
  const remove = useCallback(async (): Promise<void> => {
    await change([{ op: "remove", task: task.number }]);
  }, [change, task.number]);
  const recurring = task.recurring === true;
  const recur = useCallback(async (): Promise<void> => {
    await change([{ op: "recur", task: task.number, recurring: !recurring }]);
  }, [change, task.number, recurring]);
  let recurLabel = TASKS_COPY.makeRecurring(task.text);
  let recurText: string = TASKS_COPY.makeRecurringLabel;
  if (recurring) {
    recurLabel = TASKS_COPY.makeOneOff(task.text);
    recurText = TASKS_COPY.makeOneOffLabel;
  }
  let detail: ReactNode;
  if (chain !== undefined) {
    detail = <StreakChainLine chain={chain} />;
  }
  let checkLabel = TASKS_COPY.checkOff(task.text);
  if (task.done) {
    checkLabel = TASKS_COPY.reopen(task.text);
  }
  return (
    <EditableListRow
      id={String(task.number)}
      text={task.text}
      editor={TASK_EDITOR}
      editLabel={TASKS_COPY.edit(task.text)}
      actionsLabel={TASKS_COPY.actions(task.text)}
      menuLabel={TASKS_COPY.taskNumber(task.number)}
      disabled={disabled}
      checked={task.done}
      toggleLabel={checkLabel}
      onToggle={toggle}
      onSave={save}
      badge={dailies && recurringBadge(task, chain)}
      detail={detail}
    >
      {!task.done && (
        <>
          <EditableListAction
            icon="arrow-up"
            onSelect={moveUp}
            disabled={first}
            label={TASKS_COPY.moveUp(task.text)}
          >
            {TASKS_COPY.moveUpLabel}
          </EditableListAction>
          <EditableListAction
            icon="arrow-down"
            onSelect={moveDown}
            disabled={last}
            label={TASKS_COPY.moveDown(task.text)}
          >
            {TASKS_COPY.moveDownLabel}
          </EditableListAction>
        </>
      )}
      {dailies === true && (
        <EditableListAction icon="repeat" onSelect={recur} label={recurLabel}>
          {recurText}
        </EditableListAction>
      )}
      <EditableListAction
        icon="trash"
        onSelect={remove}
        label={TASKS_COPY.remove(task.text)}
      >
        {TASKS_COPY.removeLabel}
      </EditableListAction>
    </EditableListRow>
  );
}

// What the last direct change said: a local routine line, with Undo, or
// why nothing changed, in the status region, which stays mounted; or, when the change
// failed, an alert.
function Feedback({ tasks }: { readonly tasks: TasksController }): JSX.Element {
  const { feedback, undoLast: undo } = tasks;
  const undoVersion = feedback?.undoVersion;
  const undoLast = useCallback((): Promise<void> => {
    if (undoVersion === undefined) {
      return Promise.resolve();
    }
    return undo(undoVersion);
  }, [undo, undoVersion]);
  let routine = feedback;
  if (feedback?.failed === true) {
    routine = undefined;
  }
  return (
    <>
      <FormStatus>
        {routine !== undefined && (
          <span className="flex flex-wrap items-center gap-2">
            <span>{routine.text}</span>
            {undoVersion !== undefined &&
              !tasks.state.undone.includes(undoVersion) && (
                <Button
                  variant="quiet"
                  onClick={undoLast}
                  disabled={tasks.pending}
                >
                  {TASKS_COPY.undo}
                </Button>
              )}
          </span>
        )}
      </FormStatus>
      {feedback?.failed === true && <Alert>{feedback.text}</Alert>}
    </>
  );
}

function TaskRows(): JSX.Element | null {
  const tasks = useTasks();
  const days = tasks?.days;
  const current = tasks?.state.tasks;
  const chainOf = useMemo(() => {
    if (days === undefined || current === undefined) {
      return NO_CHAINS;
    }
    return streakChains(days, current);
  }, [days, current]);
  const add = useCallback(
    async (text: string): Promise<boolean> => {
      if (tasks === undefined) {
        return false;
      }
      // As /add does, which the panel sends in an adventure.
      return await tasks.change([{ op: "add", text }]);
    },
    [tasks],
  );
  const reorder = useCallback(
    async (id: string, beforeId: string | undefined): Promise<boolean> => {
      if (tasks === undefined) {
        return false;
      }
      const task = tasks.state.tasks.items.find(
        (item) => String(item.number) === id,
      );
      const before = tasks.state.tasks.items.find(
        (item) => String(item.number) === beforeId,
      );
      if (
        task === undefined ||
        task.done ||
        (beforeId !== undefined && before === undefined)
      ) {
        return false;
      }
      return await tasks.change([
        { op: "move", task: task.number, before: before?.number },
      ]);
    },
    [tasks],
  );
  if (tasks === undefined) {
    return null;
  }
  const disabled = tasks.disabledNote !== undefined || tasks.pending;
  const open = openTasks(tasks.state.tasks);
  const done = doneTasks(tasks.state.tasks);
  return (
    <div className="tasks">
      <AddListItem
        label={TASKS_COPY.addPlaceholder}
        editor={ADD_EDITOR}
        disabled={disabled}
        onSave={add}
      />
      <EditableList label={TASKS_COPY.tasksLabel} onMove={reorder}>
        {open.map((task, index) => (
          <TaskRow
            key={task.number}
            tasks={tasks}
            task={task}
            first={index === 0}
            last={index === open.length - 1}
            disabled={disabled}
            dailies={days !== undefined}
            chain={chainOf.get(task.number)}
          />
        ))}
      </EditableList>
      {done.length > 0 && (
        <details className="tasks-done">
          <summary>{TASKS_COPY.done(done.length)}</summary>
          <EditableList label={TASKS_COPY.done(done.length)}>
            {done.map((task) => (
              <TaskRow
                key={task.number}
                tasks={tasks}
                task={task}
                first={true}
                last={true}
                disabled={disabled}
                dailies={days !== undefined}
                chain={chainOf.get(task.number)}
              />
            ))}
          </EditableList>
        </details>
      )}
      {tasks.disabledNote !== undefined && (
        <p className="text-muted text-sm">{tasks.disabledNote}</p>
      )}
      <Feedback tasks={tasks} />
    </div>
  );
}

export { TaskRows };
