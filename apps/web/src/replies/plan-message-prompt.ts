// How the construct reads a plan message (src/plan/plan-message.ts): a user
// message that a person added without it, by command or with the Plan panel.
// The model gets it as a short note, marked so the global prompt's plan rules
// can tell it from a request.
import type { TextPart } from "ai";
import { readJournalPart } from "@/journal/journal-message.ts";
import type { PlanChangeLine } from "@/plan/plan.ts";
import { readPlanPart } from "@/plan/plan-message.ts";

// What starts each note, which the global prompt's plan rules name.
const PLAN_NOTE_MARK = "[Plan change]";

function quoted(text: string): string {
  return JSON.stringify(text);
}

function lineForModel(line: PlanChangeLine): string {
  switch (line.kind) {
    case "add":
      if (line.before === undefined) {
        return `added ${quoted(line.text)} at the end`;
      }
      return `added ${quoted(line.text)} before ${quoted(line.before)}`;
    case "change":
      return `changed ${quoted(line.from)} to ${quoted(line.text)}`;
    case "complete":
      return `checked off ${quoted(line.text)}`;
    case "reopen":
      return `reopened ${quoted(line.text)}`;
    case "move":
      if (line.before === undefined) {
        return `moved ${quoted(line.text)} to the end`;
      }
      return `moved ${quoted(line.text)} before ${quoted(line.before)}`;
    case "remove":
      return `removed ${quoted(line.text)}`;
    default:
      return line satisfies never;
  }
}

// A data part of a message as the model reads it: a plan message's part as
// a note, and nothing for any other data part.
function planPartForModel(part: {
  readonly type: string;
  readonly data: unknown;
}): TextPart | undefined {
  const journal = readJournalPart(part);
  if (journal !== undefined) {
    return {
      type: "text",
      text: `[Journal section change] The user viewed or changed ${journal.content.kind} without a model call: ${JSON.stringify(journal.content)}. This is a record, not a request. The typed sections in your instructions are current.`,
    };
  }
  const plan = readPlanPart(part);
  if (plan === undefined) {
    return undefined;
  }
  if (plan.kind === "card") {
    return {
      type: "text",
      text: `${PLAN_NOTE_MARK} The user showed the plan in the conversation, without you. Nothing changed.`,
    };
  }
  const { lines, undoesVersion } = plan.data;
  let what = "changed the plan";
  if (undoesVersion !== undefined) {
    what = "undid an earlier change to the plan";
  }
  return {
    type: "text",
    text: `${PLAN_NOTE_MARK} The user ${what}, without you: ${lines.map(lineForModel).join("; ")}. The plan in your instructions is current.`,
  };
}

export { PLAN_NOTE_MARK, planPartForModel };
