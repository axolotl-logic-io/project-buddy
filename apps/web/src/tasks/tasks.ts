// A quest's Tasks: its ordered tasks of remaining work, which the construct
// and the quest's people change with the same operations. It holds the rules
// for a task's text, the operations and what each one did, so the construct's
// tool, the user's controls and the composer's commands can't drift apart. It
// imports nothing from the server, because the browser applies the same
// rules.
import { z } from "zod";

// The longest text a task may have: one line, about a sentence.
const TASK_TEXT_MAX_LENGTH = 200;

const LINE_BREAK = /[\r\n]/u;

// A task's text as it is saved: trimmed, not empty, one line and at most
// TASK_TEXT_MAX_LENGTH characters.
const TASK_TEXT = z
  .string()
  .trim()
  .min(1)
  .max(TASK_TEXT_MAX_LENGTH)
  .refine((text) => !LINE_BREAK.test(text));

// A task's number: its id within its quest's tasks, from 1 up, given in order
// and never given again, so an operation names the same task however the tasks
// moves.
const TASK_NUMBER = z.number().int().positive();

// A task is recurring when Start Day, in Dailies, reopens it each day and
// counts whether it was done; a task without the mark is done once.
const TASK = z.object({
  number: TASK_NUMBER,
  text: z.string(),
  done: z.boolean(),
  recurring: z.literal(true).optional(),
});

// A quest's Tasks: its tasks in order, open and done together, and the number its
// next new task gets.
const TASKS = z.object({
  items: z.array(TASK).readonly(),
  nextNumber: TASK_NUMBER,
});

type Task = z.infer<typeof TASK>;

type Tasks = z.infer<typeof TASKS>;

// The tasks of a quest whose tasks nobody has changed yet.
const EMPTY_TASKS: Tasks = { items: [], nextNumber: 1 };

// A quest's tasks as of its newest saved version, 0 before any change,
// with the versions whose changes were undone.
interface TasksState {
  readonly version: number;
  readonly tasks: Tasks;
  readonly undone: readonly number[];
}

const TASK_REF = TASK_NUMBER.describe("The task's number, such as 3 for #3.");

const BEFORE = TASK_NUMBER.optional().describe(
  "The number of the task to put it before. Leave it out for the end of the tasks.",
);

// One change to a tasks, as the construct and people ask for it. Each names
// its task by number.
const TASKS_OPERATION = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    text: TASK_TEXT.describe(
      "The task: one short line of something to do, such as “Block out the body and wings”.",
    ),
    before: BEFORE,
  }),
  z.object({
    op: z.literal("change"),
    task: TASK_REF,
    text: TASK_TEXT.describe("The task's new text."),
  }),
  z.object({ op: z.literal("complete"), task: TASK_REF }),
  z.object({ op: z.literal("reopen"), task: TASK_REF }),
  z.object({ op: z.literal("move"), task: TASK_REF, before: BEFORE }),
  z.object({ op: z.literal("remove"), task: TASK_REF }),
  z.object({
    op: z.literal("recur"),
    task: TASK_REF,
    recurring: z
      .boolean()
      .describe(
        "True to make the task recurring, so Start Day reopens and counts it each day; false to make it a one-off task again.",
      ),
  }),
]);

// The operation that undoes a removal: it puts the task back as it was, with
// its number. Only undo uses it, so it is never offered to the construct.
const RESTORE_OPERATION = z.object({
  op: z.literal("restore"),
  task: TASK,
  before: TASK_NUMBER.optional(),
});

// An operation an undo applies: any operation, or a restore.
const TASKS_UNDO_OPERATION = z.union([TASKS_OPERATION, RESTORE_OPERATION]);

type TasksOperation = z.infer<typeof TASKS_OPERATION>;

type TasksUndoOperation = z.infer<typeof TASKS_UNDO_OPERATION>;

// What one operation did, in words people and the construct read: the task's
// text, and for a change its text before; for an add or a move, the text of
// the task it went before, or nothing for the end.
const TASKS_CHANGE_LINE = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("add"),
    text: z.string(),
    before: z.string().optional(),
  }),
  z.object({ kind: z.literal("change"), text: z.string(), from: z.string() }),
  z.object({ kind: z.literal("complete"), text: z.string() }),
  z.object({ kind: z.literal("reopen"), text: z.string() }),
  z.object({
    kind: z.literal("move"),
    text: z.string(),
    before: z.string().optional(),
  }),
  z.object({ kind: z.literal("remove"), text: z.string() }),
  z.object({
    kind: z.literal("recur"),
    text: z.string(),
    recurring: z.boolean(),
  }),
]);

type TasksChangeLine = z.infer<typeof TASKS_CHANGE_LINE>;

// Operations fail when a named task is missing or nothing would change.
const TASKS_FAILURES = ["missing-task", "unchanged"] as const;

type TasksFailure = (typeof TASKS_FAILURES)[number];

// The tasks after operations, what each did and the operations that undo them
// all, in order; or why nothing changed.
type TasksOutcome =
  | {
      readonly kind: "changed";
      readonly tasks: Tasks;
      readonly lines: readonly TasksChangeLine[];
      readonly undo: readonly TasksUndoOperation[];
    }
  | { readonly kind: "failed"; readonly reason: TasksFailure };

// What one operation did to the tasks, or why it failed, or undefined when
// it changed nothing, such as completing a done task.
type TaskOutcome =
  | {
      readonly line: TasksChangeLine;
      readonly undo: TasksUndoOperation;
    }
  | TasksFailure
  | undefined;

// The tasks being changed, and the number the next new task gets.
interface WorkingTasks {
  readonly items: Task[];
  nextNumber: number;
}

// How a batch treats what has changed since it was made. A change is strict:
// a task it names that isn't there fails it. An undo keeps the changes made
// after the change it undoes: an operation on a task since removed, or on a
// text since edited again, is skipped, and a task moved before one since
// removed goes to the end.
type ApplyMode = "change" | "undo";

// An operation as a batch applies it; an undo's change of text also carries
// the text the change it undoes set, which it reverts only if still there.
type AppliedOperation = TasksUndoOperation & { readonly expect?: string };

function indexOf(items: readonly Task[], number: number): number {
  return items.findIndex((task) => task.number === number);
}

// The number of the task after the one at index, or undefined at the end.
function numberAfter(
  items: readonly Task[],
  index: number,
): number | undefined {
  return items[index + 1]?.number;
}

function textOf(
  items: readonly Task[],
  number: number | undefined,
): string | undefined {
  if (number === undefined) {
    return undefined;
  }
  return items[indexOf(items, number)]?.text;
}

// Puts task before the task numbered before, or at the end without one.
// False, with nothing changed, if there is no such task.
function insert(
  items: Task[],
  task: Task,
  before: number | undefined,
): boolean {
  if (before === undefined) {
    items.push(task);
    return true;
  }
  const at = indexOf(items, before);
  if (at === -1) {
    return false;
  }
  items.splice(at, 0, task);
  return true;
}

function addTask(
  working: WorkingTasks,
  task: Task,
  before: number | undefined,
): TaskOutcome {
  const { items } = working;
  if (indexOf(items, task.number) !== -1 || !insert(items, task, before)) {
    return "missing-task";
  }
  return {
    line: { kind: "add", text: task.text, before: textOf(items, before) },
    undo: { op: "remove", task: task.number },
  };
}

function setDone(items: Task[], number: number, done: boolean): TaskOutcome {
  const at = indexOf(items, number);
  const task = items[at];
  if (task === undefined) {
    return "missing-task";
  }
  if (task.done === done) {
    return undefined;
  }
  items[at] = { ...task, done };
  if (done) {
    return {
      line: { kind: "complete", text: task.text },
      undo: { op: "reopen", task: number },
    };
  }
  return {
    line: { kind: "reopen", text: task.text },
    undo: { op: "complete", task: number },
  };
}

function changeText(items: Task[], number: number, text: string): TaskOutcome {
  const at = indexOf(items, number);
  const task = items[at];
  if (task === undefined) {
    return "missing-task";
  }
  if (task.text === text) {
    return undefined;
  }
  items[at] = { ...task, text };
  return {
    line: { kind: "change", text, from: task.text },
    undo: { op: "change", task: number, text: task.text },
  };
}

// A task marked recurring, or a one-off task again: the mark is absent, not
// false, on a one-off task.
function setRecurring(
  items: Task[],
  number: number,
  recurring: boolean,
): TaskOutcome {
  const at = indexOf(items, number);
  const task = items[at];
  if (task === undefined) {
    return "missing-task";
  }
  if ((task.recurring === true) === recurring) {
    return undefined;
  }
  const oneOff: Task = {
    number: task.number,
    text: task.text,
    done: task.done,
  };
  if (recurring) {
    items[at] = { ...oneOff, recurring: true };
  } else {
    items[at] = oneOff;
  }
  return {
    line: { kind: "recur", text: task.text, recurring },
    undo: { op: "recur", task: number, recurring: !recurring },
  };
}

function moveTask(
  items: Task[],
  number: number,
  before: number | undefined,
): TaskOutcome {
  const at = indexOf(items, number);
  const task = items[at];
  if (
    task === undefined ||
    (before !== undefined && indexOf(items, before) === -1)
  ) {
    return "missing-task";
  }
  const wasBefore = numberAfter(items, at);
  if (before === number || before === wasBefore) {
    return undefined;
  }
  items.splice(at, 1);
  insert(items, task, before);
  return {
    line: { kind: "move", text: task.text, before: textOf(items, before) },
    undo: { op: "move", task: number, before: wasBefore },
  };
}

function removeTask(items: Task[], number: number): TaskOutcome {
  const at = indexOf(items, number);
  const task = items[at];
  if (task === undefined) {
    return "missing-task";
  }
  const before = numberAfter(items, at);
  items.splice(at, 1);
  return {
    line: { kind: "remove", text: task.text },
    undo: { op: "restore", task, before },
  };
}

function applyOne(
  working: WorkingTasks,
  operation: AppliedOperation,
  mode: ApplyMode,
): TaskOutcome {
  const outcome = applyOperation(working, operation, mode);
  if (mode === "undo" && outcome === "missing-task") {
    return undefined;
  }
  return outcome;
}

function applyOperation(
  working: WorkingTasks,
  operation: AppliedOperation,
  mode: ApplyMode,
): TaskOutcome {
  const { items } = working;
  switch (operation.op) {
    case "add": {
      const outcome = addTask(
        working,
        { number: working.nextNumber, text: operation.text, done: false },
        operation.before,
      );
      if (typeof outcome === "object") {
        working.nextNumber += 1;
      }
      return outcome;
    }
    case "restore": {
      // A task removed since goes back at the end.
      let { before } = operation;
      if (before !== undefined && indexOf(items, before) === -1) {
        before = undefined;
      }
      return addTask(working, operation.task, before);
    }
    case "change":
      if (
        operation.expect !== undefined &&
        textOf(items, operation.task) !== operation.expect
      ) {
        return undefined;
      }
      return changeText(items, operation.task, operation.text);
    case "complete":
      return setDone(items, operation.task, true);
    case "reopen":
      return setDone(items, operation.task, false);
    case "move": {
      let { before } = operation;
      if (
        mode === "undo" &&
        before !== undefined &&
        indexOf(items, before) === -1
      ) {
        before = undefined;
      }
      return moveTask(items, operation.task, before);
    }
    case "remove":
      return removeTask(items, operation.task);
    case "recur":
      return setRecurring(items, operation.task, operation.recurring);
    default:
      return operation satisfies never;
  }
}

function applyBatch(
  tasks: Tasks,
  operations: readonly AppliedOperation[],
  mode: ApplyMode,
): TasksOutcome {
  const working: WorkingTasks = {
    items: [...tasks.items],
    nextNumber: tasks.nextNumber,
  };
  const lines: TasksChangeLine[] = [];
  const undo: TasksUndoOperation[] = [];
  for (const operation of operations) {
    const outcome = applyOne(working, operation, mode);
    if (typeof outcome === "string") {
      return { kind: "failed", reason: outcome };
    }
    if (outcome !== undefined) {
      lines.push(outcome.line);
      undo.unshift(outcome.undo);
    }
  }
  if (lines.length === 0) {
    return { kind: "failed", reason: "unchanged" };
  }
  return {
    kind: "changed",
    tasks: { items: working.items, nextNumber: working.nextNumber },
    lines,
    undo,
  };
}

// The tasks with operations applied in order, all or none: what each one
// that changed something did, and the operations that undo them. An
// operation that would change nothing, such as completing a done task, is
// skipped. Nothing changes if a named task is missing or no operation
// changes anything.
function applyTasksOperations(
  tasks: Tasks,
  operations: readonly TasksUndoOperation[],
): TasksOutcome {
  return applyBatch(tasks, operations, "change");
}

// The tasks with a saved change undone: its undo operations, which keep the
// changes made since (ApplyMode). lines are what the change did, in order,
// which its undo operations answer in reverse; each change of text is
// reverted only while the task still has the text the change set. It fails
// as applyTasksOperations does, and as "unchanged" when nothing the change
// did is left to undo.
function applyTasksUndo(
  tasks: Tasks,
  change: {
    readonly undo: readonly TasksUndoOperation[];
    readonly lines: readonly TasksChangeLine[];
  },
): TasksOutcome {
  const { undo, lines } = change;
  const operations = undo.map((operation, index): AppliedOperation => {
    const line = lines.at(-1 - index);
    if (operation.op === "change" && line?.kind === "change") {
      return { ...operation, expect: line.text };
    }
    return operation;
  });
  return applyBatch(tasks, operations, "undo");
}

// The  tasks, in order.
function openTasks(tasks: Tasks): Task[] {
  return tasks.items.filter((task) => !task.done);
}

// The  tasks, in order.
function doneTasks(tasks: Tasks): Task[] {
  return tasks.items.filter((task) => task.done);
}

// The quest's next task: the first open task, or undefined if it has
// none.
function nextTask(tasks: Tasks): Task | undefined {
  return tasks.items.find((task) => !task.done);
}

// The operation that moves the open task numbered number up or down one
// place among the open tasks, or undefined if it is first or last already,
// or not open. Done tasks keep their places.
function moveAmongOpen(
  tasks: Tasks,
  number: number,
  direction: "up" | "down",
): TasksOperation | undefined {
  const open = openTasks(tasks);
  const at = open.findIndex((task) => task.number === number);
  if (at === -1) {
    return undefined;
  }
  if (direction === "up") {
    const before = open[at - 1];
    if (before === undefined) {
      return undefined;
    }
    return { op: "move", task: number, before: before.number };
  }
  if (at === open.length - 1) {
    return undefined;
  }
  return { op: "move", task: number, before: open[at + 2]?.number };
}

// The operation that moves the open task numbered number to place (from 1)
// among the open tasks, or undefined if there is no such place or task.
function moveToPlace(
  tasks: Tasks,
  number: number,
  place: number,
): TasksOperation | undefined {
  const open = openTasks(tasks);
  if (
    !(open.some((task) => task.number === number) && Number.isInteger(place)) ||
    place < 1 ||
    place > open.length
  ) {
    return undefined;
  }
  const others = open.filter((task) => task.number !== number);
  return { op: "move", task: number, before: others[place - 1]?.number };
}

export type {
  Task,
  Tasks,
  TasksChangeLine,
  TasksFailure,
  TasksOperation,
  TasksState,
  TasksUndoOperation,
};
export {
  applyTasksOperations,
  applyTasksUndo,
  doneTasks,
  EMPTY_TASKS,
  moveAmongOpen,
  moveToPlace,
  nextTask,
  openTasks,
  TASK_TEXT,
  TASK_TEXT_MAX_LENGTH,
  TASKS,
  TASKS_CHANGE_LINE,
  TASKS_FAILURES,
  TASKS_OPERATION,
  TASKS_UNDO_OPERATION,
};
