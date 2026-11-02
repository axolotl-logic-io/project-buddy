// A project's next step: the one small thing the user means to do next in
// the project, as its memory records it on a line of its own that starts
// "Next step:". The buddy keeps that line current (the update_memory tool's
// description asks it to), and the user may write or edit it on the memory
// page. Reading it takes no model call. It imports nothing from the server,
// so pages, prompts and tests can use it.
import type { Memory } from "@/memory/memory.ts";

// What starts the line, as the buddy is asked to write it.
const NEXT_STEP_LABEL = "Next step:";

// A line holding the next step, written as the buddy is asked to, or as a
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

export { NEXT_STEP_LABEL, nextStepOf };
