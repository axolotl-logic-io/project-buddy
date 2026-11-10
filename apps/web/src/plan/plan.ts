// A quest's plan: its ordered steps of remaining work, which the construct
// and the quest's people change with the same operations. It holds the rules
// for a step's text, the operations and what each one did, so the construct's
// tool, the user's controls and the composer's commands can't drift apart. It
// imports nothing from the server, because the browser applies the same
// rules.
import { z } from "zod";

// The longest text a step may have: one line, about a sentence.
const PLAN_STEP_TEXT_MAX_LENGTH = 200;

// The most open steps a plan may hold. A plan is the next stretch of work, not
// every idea: the project-breakdown activity asks for no huge task lists.
const MOST_OPEN_STEPS = 30;

const LINE_BREAK = /[\r\n]/u;

// A step's text as it is saved: trimmed, not empty, one line and at most
// PLAN_STEP_TEXT_MAX_LENGTH characters.
const PLAN_STEP_TEXT = z
  .string()
  .trim()
  .min(1)
  .max(PLAN_STEP_TEXT_MAX_LENGTH)
  .refine((text) => !LINE_BREAK.test(text));

// A step's number: its id within its quest's plan, from 1 up, given in order
// and never given again, so an operation names the same step however the plan
// moves.
const PLAN_STEP_NUMBER = z.number().int().positive();

const PLAN_STEP = z.object({
  number: PLAN_STEP_NUMBER,
  text: z.string(),
  done: z.boolean(),
});

// A plan: its steps in order, open and done together, and the number its
// next new step gets.
const PLAN = z.object({
  steps: z.array(PLAN_STEP).readonly(),
  nextNumber: PLAN_STEP_NUMBER,
});

type PlanStep = z.infer<typeof PLAN_STEP>;

type Plan = z.infer<typeof PLAN>;

// The plan of a quest whose plan nobody has changed yet.
const EMPTY_PLAN: Plan = { steps: [], nextNumber: 1 };

// A project's plan as of its newest saved version, 0 before any change,
// with the versions whose changes were undone.
interface PlanState {
  readonly version: number;
  readonly plan: Plan;
  readonly undone: readonly number[];
}

const STEP = PLAN_STEP_NUMBER.describe("The step's number, such as 3 for #3.");

const BEFORE = PLAN_STEP_NUMBER.optional().describe(
  "The number of the step to put it before. Leave it out for the end of the plan.",
);

// One change to a plan, as the construct and people ask for it. Each names
// its step by number.
const PLAN_OPERATION = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    text: PLAN_STEP_TEXT.describe(
      "The step: one short line of something to do, such as “Block out the body and wings”.",
    ),
    before: BEFORE,
  }),
  z.object({
    op: z.literal("change"),
    step: STEP,
    text: PLAN_STEP_TEXT.describe("The step's new text."),
  }),
  z.object({ op: z.literal("complete"), step: STEP }),
  z.object({ op: z.literal("reopen"), step: STEP }),
  z.object({ op: z.literal("move"), step: STEP, before: BEFORE }),
  z.object({ op: z.literal("remove"), step: STEP }),
]);

// The operation that undoes a removal: it puts the step back as it was, with
// its number. Only undo uses it, so it is never offered to the construct.
const RESTORE_OPERATION = z.object({
  op: z.literal("restore"),
  step: PLAN_STEP,
  before: PLAN_STEP_NUMBER.optional(),
});

// An operation an undo applies: any operation, or a restore.
const PLAN_UNDO_OPERATION = z.union([PLAN_OPERATION, RESTORE_OPERATION]);

type PlanOperation = z.infer<typeof PLAN_OPERATION>;

type PlanUndoOperation = z.infer<typeof PLAN_UNDO_OPERATION>;

// What one operation did, in words people and the construct read: the step's
// text, and for a change its text before; for an add or a move, the text of
// the step it went before, or nothing for the end.
const PLAN_CHANGE_LINE = z.discriminatedUnion("kind", [
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
]);

type PlanChangeLine = z.infer<typeof PLAN_CHANGE_LINE>;

// Why operations left the plan as it was: a step they name isn't in it, they
// would make it hold more than MOST_OPEN_STEPS open steps, or they would
// change nothing.
const PLAN_FAILURES = ["missing-step", "too-many-steps", "unchanged"] as const;

type PlanFailure = (typeof PLAN_FAILURES)[number];

// The plan after operations, what each did and the operations that undo them
// all, in order; or why nothing changed.
type PlanOutcome =
  | {
      readonly kind: "changed";
      readonly plan: Plan;
      readonly lines: readonly PlanChangeLine[];
      readonly undo: readonly PlanUndoOperation[];
    }
  | { readonly kind: "failed"; readonly reason: PlanFailure };

// What one operation did to the steps, or why it failed, or undefined when
// it changed nothing, such as completing a done step.
type StepOutcome =
  | {
      readonly line: PlanChangeLine;
      readonly undo: PlanUndoOperation;
    }
  | PlanFailure
  | undefined;

// The steps being changed, and the number the next new step gets.
interface WorkingPlan {
  readonly steps: PlanStep[];
  nextNumber: number;
}

function indexOf(steps: readonly PlanStep[], number: number): number {
  return steps.findIndex((step) => step.number === number);
}

// The number of the step after the one at index, or undefined at the end.
function numberAfter(
  steps: readonly PlanStep[],
  index: number,
): number | undefined {
  return steps[index + 1]?.number;
}

function textOf(
  steps: readonly PlanStep[],
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
  steps: PlanStep[],
  step: PlanStep,
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

function openCount(steps: readonly PlanStep[]): number {
  return steps.filter((step) => !step.done).length;
}

function addStep(
  working: WorkingPlan,
  step: PlanStep,
  before: number | undefined,
): StepOutcome {
  const { steps } = working;
  if (!step.done && openCount(steps) >= MOST_OPEN_STEPS) {
    return "too-many-steps";
  }
  if (indexOf(steps, step.number) !== -1 || !insert(steps, step, before)) {
    return "missing-step";
  }
  return {
    line: { kind: "add", text: step.text, before: textOf(steps, before) },
    undo: { op: "remove", step: step.number },
  };
}

function setDone(
  steps: PlanStep[],
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
  if (!done && openCount(steps) >= MOST_OPEN_STEPS) {
    return "too-many-steps";
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
  steps: PlanStep[],
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

function moveStep(
  steps: PlanStep[],
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

function removeStep(steps: PlanStep[], number: number): StepOutcome {
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
  working: WorkingPlan,
  operation: PlanUndoOperation,
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
      return changeText(steps, operation.step, operation.text);
    case "complete":
      return setDone(steps, operation.step, true);
    case "reopen":
      return setDone(steps, operation.step, false);
    case "move":
      return moveStep(steps, operation.step, operation.before);
    case "remove":
      return removeStep(steps, operation.step);
    default:
      return operation satisfies never;
  }
}

// The plan with operations applied in order, all or none: what each one
// that changed something did, and the operations that undo them. An
// operation that would change nothing, such as completing a done step, is
// skipped. Nothing changes if one names a step that isn't there, if the plan
// would hold more than MOST_OPEN_STEPS open steps, or if none changes
// anything.
function applyPlanOperations(
  plan: Plan,
  operations: readonly PlanUndoOperation[],
): PlanOutcome {
  const working: WorkingPlan = {
    steps: [...plan.steps],
    nextNumber: plan.nextNumber,
  };
  const lines: PlanChangeLine[] = [];
  const undo: PlanUndoOperation[] = [];
  for (const operation of operations) {
    const outcome = applyOne(working, operation);
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
    plan: { steps: working.steps, nextNumber: working.nextNumber },
    lines,
    undo,
  };
}

// The plan's open steps, in order.
function openSteps(plan: Plan): PlanStep[] {
  return plan.steps.filter((step) => !step.done);
}

// The plan's done steps, in order.
function doneSteps(plan: Plan): PlanStep[] {
  return plan.steps.filter((step) => step.done);
}

// The quest's next step: the plan's first open step, or undefined if it has
// none.
function nextPlanStep(plan: Plan): PlanStep | undefined {
  return plan.steps.find((step) => !step.done);
}

// The operation that moves the open step numbered number up or down one
// place among the open steps, or undefined if it is first or last already,
// or not open. Done steps keep their places.
function moveAmongOpen(
  plan: Plan,
  number: number,
  direction: "up" | "down",
): PlanOperation | undefined {
  const open = openSteps(plan);
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
  plan: Plan,
  number: number,
  place: number,
): PlanOperation | undefined {
  const open = openSteps(plan);
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
  Plan,
  PlanChangeLine,
  PlanFailure,
  PlanOperation,
  PlanOutcome,
  PlanState,
  PlanStep,
  PlanUndoOperation,
};
export {
  applyPlanOperations,
  doneSteps,
  EMPTY_PLAN,
  MOST_OPEN_STEPS,
  moveAmongOpen,
  moveToPlace,
  nextPlanStep,
  openSteps,
  PLAN,
  PLAN_CHANGE_LINE,
  PLAN_FAILURES,
  PLAN_OPERATION,
  PLAN_STEP_NUMBER,
  PLAN_STEP_TEXT,
  PLAN_STEP_TEXT_MAX_LENGTH,
  PLAN_UNDO_OPERATION,
};
