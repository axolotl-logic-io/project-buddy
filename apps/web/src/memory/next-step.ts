// A quest's next step: the one small thing the user means to do next. It is
// the first open step of the quest's plan (src/plan/plan.ts). A quest whose
// plan has never had a step, such as one from before plans, falls back to
// its Journal's own line that starts "Next step:", which the construct and
// the user used to keep there. Once the plan has had a step, it alone says:
// a plan emptied, or with every step done, has no next step. Reading it takes no model call. It imports
// nothing from the server, so pages, prompts and tests can use it.

import { nextPlanStep, type Plan } from "../plan/plan.ts";
import type { Memory } from "./memory.ts";

// What starts the Journal's line, as the construct was asked to write it.
const NEXT_STEP_LABEL = "Next step:";

// A line holding the next step, written as the construct is asked to, or as a
// person might: as a list item or heading, in any case, with the label in
// emphasis or not. Emphasis round the label, with or without its colon, is
// taken off only as a matched pair; the step's own text is kept as written.
const NEXT_STEP_LINE =
  /^[ \t]*(?:[-*+][ \t]+|#{1,6}[ \t]+)?(?:(?<emphasis>\*\*|__|\*|_)next step(?:\k<emphasis>[ \t]*:|[ \t]*:\k<emphasis>)|next step[ \t]*:)[ \t]*(?<step>.*?)[ \t]*$/imu;

// The next step the memory records, or undefined if it records none: its
// first "Next step:" line, without the label, and nothing if that line is
// blank after it.
function nextStepOf(memory: Memory): string | undefined {
  const { step } = NEXT_STEP_LINE.exec(memory.text)?.groups ?? {};
  if (step === undefined || step === "") {
    return undefined;
  }
  return step;
}

// The quest's next step: its plan's first open step; or, while the plan has
// never had a step (the first one added is numbered 1), its memory's; or
// undefined if neither has one.
function nextStepOfQuest(memory: Memory, plan: Plan): string | undefined {
  if (plan.nextNumber === 1) {
    return nextStepOf(memory);
  }
  return nextPlanStep(plan)?.text;
}

export { NEXT_STEP_LABEL, nextStepOf, nextStepOfQuest };
