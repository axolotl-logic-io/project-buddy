// The chat's built-in commands: a message that starts with "/" and a name,
// which the site runs at once instead of sending to the construct, so the
// plan can be kept without a model call. The plan commands name steps by
// their numbers, as the plan shows them (#3 or 3). It imports nothing from
// the server, because the composer in the browser tells commands apart with
// the same rules.

import { z } from "zod";
import {
  moveToPlace,
  nextPlanStep,
  PLAN_STEP_TEXT,
  type Plan,
  type PlanOperation,
} from "@/plan/plan.ts";
import { questStatusCommand } from "@/quests/quest-status-commands.ts";
import { isLocalCommandName } from "@/replies/local-command-contract.ts";

// A command: "/", its name, then its argument, if any, after white space.
const COMMAND_LINE = /^\/(?<name>[^\s/]+)(?:\s+(?<argument>[\s\S]*))?$/u;

// A step as a command names it: its number, with or without "#".
const STEP_ARGUMENT = /^#?(?<number>\d+)$/u;

// The step argument first, then the rest.
const STEP_THEN_REST = /^(?<step>\S+)(?:\s+(?<rest>[\s\S]*))?$/u;

const WHITE_SPACE = /\s+/u;

// What starts the mock model's own commands (src/replies/mock-script.ts),
// which go to the construct as messages while the mock model runs.
const MOCK_COMMAND_PREFIX = "mock-";

// The built-in commands' names, in the order the composer lists them.
const PLAN_COMMAND_NAMES = [
  "plan",
  "add",
  "done",
  "reopen",
  "edit",
  "move",
  "drop",
  "undo",
] as const;

type PlanCommandName = (typeof PLAN_COMMAND_NAMES)[number];

// How each command is written, its arguments as placeholders.
const PLAN_COMMAND_USAGE: Readonly<Record<PlanCommandName, string>> = {
  plan: "/plan",
  add: "/add TEXT",
  done: "/done [STEP]",
  reopen: "/reopen STEP",
  edit: "/edit STEP TEXT",
  move: "/move STEP PLACE",
  drop: "/drop STEP",
  undo: "/undo",
};

// Why a command did nothing: no such command, its text is missing or too
// long, it names no step the plan has, or no place among the open steps.
type CommandProblem =
  | { readonly kind: "unknown"; readonly name: string }
  | { readonly kind: "no-text"; readonly name: PlanCommandName }
  | { readonly kind: "too-long" }
  | { readonly kind: "no-step"; readonly step: string | undefined }
  | { readonly kind: "no-place"; readonly most: number };

// What a command asks for: to show the plan, to undo the user's last change
// in the chat, or to change the plan; or why it can't.
type PlanCommand =
  | { readonly kind: "show" }
  | { readonly kind: "undo" }
  | { readonly kind: "change"; readonly operations: readonly PlanOperation[] }
  | { readonly kind: "problem"; readonly problem: CommandProblem };

const PLAN_COMMAND_NAME = z.enum(PLAN_COMMAND_NAMES);

// The name of the command text is, or undefined if it is no command.
function commandNameOf(text: string): string | undefined {
  const { name } = COMMAND_LINE.exec(text.trim())?.groups ?? {};
  return name;
}

// Where a message is typed: whether the mock model runs, and whether the
// adventure is in a quest.
interface CommandPlace {
  readonly mockCommands: boolean;
  readonly inQuest: boolean;
}

// Whether the site runs text as a command rather than sending it to the
// construct. In a quest's adventure that is any message that starts with
// "/" and a name, except local construct commands and, while the mock
// model runs, its own `/mock-…`
// commands. In a standalone adventure it is only a plan command's name,
// which says it needs a quest; any other goes to the construct as written.
function isChatCommand(text: string, place: CommandPlace): boolean {
  const name = commandNameOf(text);
  if (name === undefined || isLocalCommandName(name)) {
    return false;
  }
  if (!place.inQuest) {
    return (
      PLAN_COMMAND_NAME.safeParse(name).success ||
      questStatusCommand(text) !== undefined
    );
  }
  return !(place.mockCommands && name.startsWith(MOCK_COMMAND_PREFIX));
}

function problem(found: CommandProblem): PlanCommand {
  return { kind: "problem", problem: found };
}

// The number of the plan's step that argument names, or undefined.
function stepNumber(
  plan: Plan,
  argument: string | undefined,
): number | undefined {
  const { number: digits } = STEP_ARGUMENT.exec(argument ?? "")?.groups ?? {};
  if (digits === undefined) {
    return undefined;
  }
  const number = Number(digits);
  if (!plan.steps.some((step) => step.number === number)) {
    return undefined;
  }
  return number;
}

// A step's new text as the plan saves it, or the problem with it.
function stepText(
  name: PlanCommandName,
  text: string,
): string | CommandProblem {
  const oneLine = text.split(WHITE_SPACE).join(" ").trim();
  if (oneLine === "") {
    return { kind: "no-text", name };
  }
  const parsed = PLAN_STEP_TEXT.safeParse(oneLine);
  if (!parsed.success) {
    return { kind: "too-long" };
  }
  return parsed.data;
}

function split(argument: string): {
  step: string | undefined;
  rest: string;
} {
  const { step, rest = "" } =
    STEP_THEN_REST.exec(argument.trim())?.groups ?? {};
  return { step, rest };
}

// The operation on the one step argument names.
function onStep(
  plan: Plan,
  argument: string,
  op: "complete" | "reopen" | "remove",
): PlanCommand {
  const step = stepNumber(plan, argument.trim());
  if (step === undefined) {
    return problem({ kind: "no-step", step: argument.trim() || undefined });
  }
  return { kind: "change", operations: [{ op, step }] };
}

function addCommand(argument: string): PlanCommand {
  const text = stepText("add", argument);
  if (typeof text !== "string") {
    return problem(text);
  }
  return { kind: "change", operations: [{ op: "add", text }] };
}

function doneCommand(plan: Plan, argument: string): PlanCommand {
  if (argument.trim() !== "") {
    return onStep(plan, argument, "complete");
  }
  const next = nextPlanStep(plan);
  if (next === undefined) {
    return problem({ kind: "no-step", step: undefined });
  }
  return {
    kind: "change",
    operations: [{ op: "complete", step: next.number }],
  };
}

function editCommand(plan: Plan, argument: string): PlanCommand {
  const { step: named, rest } = split(argument);
  const step = stepNumber(plan, named);
  if (step === undefined) {
    return problem({ kind: "no-step", step: named });
  }
  const text = stepText("edit", rest);
  if (typeof text !== "string") {
    return problem(text);
  }
  return { kind: "change", operations: [{ op: "change", step, text }] };
}

function moveCommand(plan: Plan, argument: string): PlanCommand {
  const { step: named, rest } = split(argument);
  const step = stepNumber(plan, named);
  const most = plan.steps.filter((open) => !open.done).length;
  if (step === undefined) {
    return problem({ kind: "no-step", step: named });
  }
  const operation = moveToPlace(plan, step, Number(rest.trim()));
  if (operation === undefined || rest.trim() === "") {
    return problem({ kind: "no-place", most });
  }
  return { kind: "change", operations: [operation] };
}

// What the command text asks of the plan as it is.
function parsePlanCommand(text: string, plan: Plan): PlanCommand {
  const { name = "", argument = "" } =
    COMMAND_LINE.exec(text.trim())?.groups ?? {};
  const { data: known } = PLAN_COMMAND_NAME.safeParse(name);
  if (known === undefined) {
    return problem({ kind: "unknown", name });
  }
  switch (known) {
    case "plan":
      return { kind: "show" };
    case "undo":
      return { kind: "undo" };
    case "add":
      return addCommand(argument);
    case "done":
      return doneCommand(plan, argument);
    case "reopen":
      return onStep(plan, argument, "reopen");
    case "drop":
      return onStep(plan, argument, "remove");
    case "edit":
      return editCommand(plan, argument);
    case "move":
      return moveCommand(plan, argument);
    default:
      return known satisfies never;
  }
}

export type { CommandProblem, PlanCommand, PlanCommandName };
export {
  commandNameOf,
  isChatCommand,
  MOCK_COMMAND_PREFIX,
  PLAN_COMMAND_NAMES,
  PLAN_COMMAND_USAGE,
  parsePlanCommand,
};
