// A quest's tasks: its ordered steps of remaining work, which the construct
// and the quest's people change with the same operations. It holds the rules
// for a step's text, the operations and what each one did, so the construct's
// tool, the user's controls and the composer's commands can't drift apart. It
// imports nothing from the server, because the browser applies the same
// rules.
import { z } from "zod";

// The longest text a step may have: one line, about a sentence.
const TASKS_STEP_TEXT_MAX_LENGTH = 200;

const LINE_BREAK = /[\r\n]/u;

// A step's text as it is saved: trimmed, not empty, one line and at most
// TASKS_STEP_TEXT_MAX_LENGTH characters.
const TASKS_STEP_TEXT = z
  .string()
  .trim()
  .min(1)
  .max(TASKS_STEP_TEXT_MAX_LENGTH)
  .refine((text) => !LINE_BREAK.test(text));

// A step's number: its id within its quest's tasks, from 1 up, given in order
// and never given again, so an operation names the same step however the tasks
// moves.
const TASKS_STEP_NUMBER = z.number().int().positive();

// A step is recurring when Start Day, in Dailies, reopens it each day and
// counts whether it was done; a step without the mark is done once.
const TASKS_STEP = z.object({
  number: TASKS_STEP_NUMBER,
  text: z.string(),
  done: z.boolean(),
  recurring: z.literal(true).optional(),
});

// A tasks: its steps in order, open and done together, and the number its
// next new step gets.
const TASKS = z.object({
  steps: z.array(TASKS_STEP).readonly(),
  nextNumber: TASKS_STEP_NUMBER,
});

type TasksStep = z.infer<typeof TASKS_STEP>;

type Tasks = z.infer<typeof TASKS>;

// The tasks of a quest whose tasks nobody has changed yet.
const EMPTY_TASKS: Tasks = { steps: [], nextNumber: 1 };

// A quest's tasks as of its newest saved version, 0 before any change,
// with the versions whose changes were undone.
interface TasksState {
  readonly version: number;
  readonly tasks: Tasks;
  readonly undone: readonly number[];
}

const STEP = TASKS_STEP_NUMBER.describe("The step's number, such as 3 for #3.");

const BEFORE = TASKS_STEP_NUMBER.optional().describe(
  "The number of the step to put it before. Leave it out for the end of the tasks.",
);

// One change to a tasks, as the construct and people ask for it. Each names
// its step by number.
const TASKS_OPERATION = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    text: TASKS_STEP_TEXT.describe(
      "The step: one short line of something to do, such as “Block out the body and wings”.",
    ),
    before: BEFORE,
  }),
  z.object({
    op: z.literal("change"),
    step: STEP,
    text: TASKS_STEP_TEXT.describe("The step's new text."),
  }),
  z.object({ op: z.literal("complete"), step: STEP }),
  z.object({ op: z.literal("reopen"), step: STEP }),
  z.object({ op: z.literal("move"), step: STEP, before: BEFORE }),
  z.object({ op: z.literal("remove"), step: STEP }),
  z.object({
    op: z.literal("recur"),
    step: STEP,
    recurring: z
      .boolean()
      .describe(
        "True to make the step recurring, so Start Day reopens and counts it each day; false to make it a one-off step again.",
      ),
  }),
]);

// The operation that undoes a removal: it puts the step back as it was, with
// its number. Only undo uses it, so it is never offered to the construct.
const RESTORE_OPERATION = z.object({
  op: z.literal("restore"),
  step: TASKS_STEP,
  before: TASKS_STEP_NUMBER.optional(),
});

// An operation an undo applies: any operation, or a restore.
const TASKS_UNDO_OPERATION = z.union([TASKS_OPERATION, RESTORE_OPERATION]);

type TasksOperation = z.infer<typeof TASKS_OPERATION>;

type TasksUndoOperation = z.infer<typeof TASKS_UNDO_OPERATION>;

// What one operation did, in words people and the construct read: the step's
// text, and for a change its text before; for an add or a move, the text of
// the step it went before, or nothing for the end.
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

// Operations fail when a named step is missing or nothing would change.
const TASKS_FAILURES = ["missing-step", "unchanged"] as const;

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

// What one operation did to the steps, or why it failed, or undefined when
// it changed nothing, such as completing a done step.
type StepOutcome =
  | {
      readonly line: TasksChangeLine;
      readonly undo: TasksUndoOperation;
    }
  | TasksFailure
  | undefined;

// The steps being changed, and the number the next new step gets.
interface WorkingTasks {
  readonly steps: TasksStep[];
  nextNumber: number;
}

// How a batch treats what has changed since it was made. A change is strict:
// a step it names that isn't there fails it. An undo keeps the changes made
// after the change it undoes: an operation on a step since removed, or on a
// text since edited again, is skipped, and a step moved before one since
// removed goes to the end.
type ApplyMode = "change" | "undo";

// An operation as a batch applies it; an undo's change of text also carries
// the text the change it undoes set, which it reverts only if still there.
type AppliedOperation = TasksUndoOperation & { readonly expect?: string };

function indexOf(steps: readonly TasksStep[], number: number): number {
  return steps.findIndex((step) => step.number === number);
}

// The number of the step after the one at index, or undefined at the end.
function numberAfter(
  steps: readonly TasksStep[],
  index: number,
): number | undefined {
  return steps[index + 1]?.number;
}

function textOf(
  steps: readonly TasksStep[],
  number: number | undefined,
): string | undefined {
  if (number === undefined) {
    return undefined;
  }
  return steps[indexOf(steps, number)]?.text;
}

// Puts step before the step numbered before, or at the end without one.
// False, with nothing changed, if there is no such step.
function insert(
  steps: TasksStep[],
  step: TasksStep,
  before: number | undefined,
): boolean {
  if (before === undefined) {
    steps.push(step);
    return true;
  }
  const at = indexOf(steps, before);
  if (at === -1) {
    return false;
  }
  steps.splice(at, 0, step);
  return true;
}

function addStep(
  working: WorkingTasks,
  step: TasksStep,
  before: number | undefined,
): StepOutcome {
  const { steps } = working;
  if (indexOf(steps, step.number) !== -1 || !insert(steps, step, before)) {
    return "missing-step";
  }
  return {
    line: { kind: "add", text: step.text, before: textOf(steps, before) },
    undo: { op: "remove", step: step.number },
  };
}

function setDone(
  steps: TasksStep[],
  number: number,
  done: boolean,
): StepOutcome {
  const at = indexOf(steps, number);
  const step = steps[at];
  if (step === undefined) {
    return "missing-step";
  }
  if (step.done === done) {
    return undefined;
  }
  steps[at] = { ...step, done };
  if (done) {
    return {
      line: { kind: "complete", text: step.text },
      undo: { op: "reopen", step: number },
    };
  }
  return {
    line: { kind: "reopen", text: step.text },
    undo: { op: "complete", step: number },
  };
}

function changeText(
  steps: TasksStep[],
  number: number,
  text: string,
): StepOutcome {
  const at = indexOf(steps, number);
  const step = steps[at];
  if (step === undefined) {
    return "missing-step";
  }
  if (step.text === text) {
    return undefined;
  }
  steps[at] = { ...step, text };
  return {
    line: { kind: "change", text, from: step.text },
    undo: { op: "change", step: number, text: step.text },
  };
}

// A step marked recurring, or a one-off step again: the mark is absent, not
// false, on a one-off step.
function setRecurring(
  steps: TasksStep[],
  number: number,
  recurring: boolean,
): StepOutcome {
  const at = indexOf(steps, number);
  const step = steps[at];
  if (step === undefined) {
    return "missing-step";
  }
  if ((step.recurring === true) === recurring) {
    return undefined;
  }
  const oneOff: TasksStep = {
    number: step.number,
    text: step.text,
    done: step.done,
  };
  if (recurring) {
    steps[at] = { ...oneOff, recurring: true };
  } else {
    steps[at] = oneOff;
  }
  return {
    line: { kind: "recur", text: step.text, recurring },
    undo: { op: "recur", step: number, recurring: !recurring },
  };
}

function moveStep(
  steps: TasksStep[],
  number: number,
  before: number | undefined,
): StepOutcome {
  const at = indexOf(steps, number);
  const step = steps[at];
  if (
    step === undefined ||
    (before !== undefined && indexOf(steps, before) === -1)
  ) {
    return "missing-step";
  }
  const wasBefore = numberAfter(steps, at);
  if (before === number || before === wasBefore) {
    return undefined;
  }
  steps.splice(at, 1);
  insert(steps, step, before);
  return {
    line: { kind: "move", text: step.text, before: textOf(steps, before) },
    undo: { op: "move", step: number, before: wasBefore },
  };
}

function removeStep(steps: TasksStep[], number: number): StepOutcome {
  const at = indexOf(steps, number);
  const step = steps[at];
  if (step === undefined) {
    return "missing-step";
  }
  const before = numberAfter(steps, at);
  steps.splice(at, 1);
  return {
    line: { kind: "remove", text: step.text },
    undo: { op: "restore", step, before },
  };
}

function applyOne(
  working: WorkingTasks,
  operation: AppliedOperation,
  mode: ApplyMode,
): StepOutcome {
  const outcome = applyOperation(working, operation, mode);
  if (mode === "undo" && outcome === "missing-step") {
    return undefined;
  }
  return outcome;
}

function applyOperation(
  working: WorkingTasks,
  operation: AppliedOperation,
  mode: ApplyMode,
): StepOutcome {
  const { steps } = working;
  switch (operation.op) {
    case "add": {
      const outcome = addStep(
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
      // A step removed since goes back at the end.
      let { before } = operation;
      if (before !== undefined && indexOf(steps, before) === -1) {
        before = undefined;
      }
      return addStep(working, operation.step, before);
    }
    case "change":
      if (
        operation.expect !== undefined &&
        textOf(steps, operation.step) !== operation.expect
      ) {
        return undefined;
      }
      return changeText(steps, operation.step, operation.text);
    case "complete":
      return setDone(steps, operation.step, true);
    case "reopen":
      return setDone(steps, operation.step, false);
    case "move": {
      let { before } = operation;
      if (
        mode === "undo" &&
        before !== undefined &&
        indexOf(steps, before) === -1
      ) {
        before = undefined;
      }
      return moveStep(steps, operation.step, before);
    }
    case "remove":
      return removeStep(steps, operation.step);
    case "recur":
      return setRecurring(steps, operation.step, operation.recurring);
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
    steps: [...tasks.steps],
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
    tasks: { steps: working.steps, nextNumber: working.nextNumber },
    lines,
    undo,
  };
}

// The tasks with operations applied in order, all or none: what each one
// that changed something did, and the operations that undo them. An
// operation that would change nothing, such as completing a done step, is
// skipped. Nothing changes if a named step is missing or no operation
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
// reverted only while the step still has the text the change set. It fails
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

// The task list's open steps, in order.
function openSteps(tasks: Tasks): TasksStep[] {
  return tasks.steps.filter((step) => !step.done);
}

// The task list's done steps, in order.
function doneSteps(tasks: Tasks): TasksStep[] {
  return tasks.steps.filter((step) => step.done);
}

// The quest's next step: the task list's first open step, or undefined if it has
// none.
function nextTasksStep(tasks: Tasks): TasksStep | undefined {
  return tasks.steps.find((step) => !step.done);
}

// The operation that moves the open step numbered number up or down one
// place among the open steps, or undefined if it is first or last already,
// or not open. Done steps keep their places.
function moveAmongOpen(
  tasks: Tasks,
  number: number,
  direction: "up" | "down",
): TasksOperation | undefined {
  const open = openSteps(tasks);
  const at = open.findIndex((step) => step.number === number);
  if (at === -1) {
    return undefined;
  }
  if (direction === "up") {
    const before = open[at - 1];
    if (before === undefined) {
      return undefined;
    }
    return { op: "move", step: number, before: before.number };
  }
  if (at === open.length - 1) {
    return undefined;
  }
  return { op: "move", step: number, before: open[at + 2]?.number };
}

// The operation that moves the open step numbered number to place (from 1)
// among the open steps, or undefined if there is no such place or step.
function moveToPlace(
  tasks: Tasks,
  number: number,
  place: number,
): TasksOperation | undefined {
  const open = openSteps(tasks);
  if (
    !(open.some((step) => step.number === number) && Number.isInteger(place)) ||
    place < 1 ||
    place > open.length
  ) {
    return undefined;
  }
  const others = open.filter((step) => step.number !== number);
  return { op: "move", step: number, before: others[place - 1]?.number };
}

export type {
  Tasks,
  TasksChangeLine,
  TasksFailure,
  TasksOperation,
  TasksState,
  TasksStep,
  TasksUndoOperation,
};
export {
  applyTasksOperations,
  applyTasksUndo,
  doneSteps,
  EMPTY_TASKS,
  moveAmongOpen,
  moveToPlace,
  nextTasksStep,
  openSteps,
  TASKS,
  TASKS_CHANGE_LINE,
  TASKS_FAILURES,
  TASKS_OPERATION,
  TASKS_STEP_TEXT,
  TASKS_STEP_TEXT_MAX_LENGTH,
  TASKS_UNDO_OPERATION,
};
