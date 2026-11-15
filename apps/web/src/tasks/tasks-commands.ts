// The chat's built-in commands: a message that starts with "/" and a name,
// which the site runs at once instead of sending to the construct, so the
// tasks can be kept without a model call. The tasks commands name steps by
// their numbers, as the tasks shows them (#3 or 3). It imports nothing from
// the server, because the composer in the browser tells commands apart with
// the same rules.

import { z } from "zod";
import { isLocalCommandName } from "@/replies/local-command-contract.ts";
import {
  moveToPlace,
  nextTasksStep,
  TASKS_STEP_TEXT,
  type Tasks,
  type TasksOperation,
} from "@/tasks/tasks.ts";

// A command: "/", its name, then its argument, if any, after white space.
const COMMAND_LINE = /^\/(?<name>[^\s/]+)(?:\s+(?<argument>[\s\S]*))?$/u;

// A step as a command names it: its number, with or without "#".
const STEP_ARGUMENT = /^#?(?<number>\d+)$/u;

// The step argument first, then the rest.
const STEP_THEN_REST = /^(?<step>\S+)(?:\s+(?<rest>[\s\S]*))?$/u;

const WHITE_SPACE = /\s+/u;

// The built-in commands' names, in the order the composer lists them.
const TASKS_COMMAND_NAMES = [
  "tasks",
  "add",
  "done",
  "reopen",
  "edit",
  "move",
  "drop",
  "undo",
] as const;

type TasksCommandName = (typeof TASKS_COMMAND_NAMES)[number];

// How each command is written, its arguments as placeholders.
const TASKS_COMMAND_USAGE: Readonly<Record<TasksCommandName, string>> = {
  tasks: "/tasks",
  add: "/add TEXT",
  done: "/done [STEP]",
  reopen: "/reopen STEP",
  edit: "/edit STEP TEXT",
  move: "/move STEP PLACE",
  drop: "/drop STEP",
  undo: "/undo",
};

// Why a command did nothing: no such command, its text is missing or too
// long, it names no step the tasks has, or no place among the open steps.
type CommandProblem =
  | { readonly kind: "unknown"; readonly name: string }
  | { readonly kind: "no-text"; readonly name: TasksCommandName }
  | { readonly kind: "too-long" }
  | { readonly kind: "no-step"; readonly step: string | undefined }
  | { readonly kind: "no-place"; readonly most: number };

// What a command asks for: to show the tasks, to undo the user's last change
// in the chat, or to change the tasks; or why it can't.
type TasksCommand =
  | { readonly kind: "show" }
  | { readonly kind: "undo" }
  | { readonly kind: "change"; readonly operations: readonly TasksOperation[] }
  | { readonly kind: "problem"; readonly problem: CommandProblem };

const TASKS_COMMAND_NAME = z.enum(TASKS_COMMAND_NAMES);

// The name of the command text is, or undefined if it is no command.
function commandNameOf(text: string): string | undefined {
  const { name } = COMMAND_LINE.exec(text.trim())?.groups ?? {};
  return name;
}

// Whether the site runs text as a command rather than sending it to the
// construct: any message that starts with "/" and a name, except local
// construct commands.
function isChatCommand(text: string): boolean {
  const name = commandNameOf(text);
  return name !== undefined && !isLocalCommandName(name);
}

function problem(found: CommandProblem): TasksCommand {
  return { kind: "problem", problem: found };
}

// The number of the task list's step that argument names, or undefined.
function stepNumber(
  tasks: Tasks,
  argument: string | undefined,
): number | undefined {
  const { number: digits } = STEP_ARGUMENT.exec(argument ?? "")?.groups ?? {};
  if (digits === undefined) {
    return undefined;
  }
  const number = Number(digits);
  if (!tasks.steps.some((step) => step.number === number)) {
    return undefined;
  }
  return number;
}

// A step's new text as the tasks saves it, or the problem with it.
function stepText(
  name: TasksCommandName,
  text: string,
): string | CommandProblem {
  const oneLine = text.split(WHITE_SPACE).join(" ").trim();
  if (oneLine === "") {
    return { kind: "no-text", name };
  }
  const parsed = TASKS_STEP_TEXT.safeParse(oneLine);
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
  tasks: Tasks,
  argument: string,
  op: "complete" | "reopen" | "remove",
): TasksCommand {
  const step = stepNumber(tasks, argument.trim());
  if (step === undefined) {
    return problem({ kind: "no-step", step: argument.trim() || undefined });
  }
  return { kind: "change", operations: [{ op, step }] };
}

function addCommand(argument: string): TasksCommand {
  const text = stepText("add", argument);
  if (typeof text !== "string") {
    return problem(text);
  }
  return { kind: "change", operations: [{ op: "add", text }] };
}

function doneCommand(tasks: Tasks, argument: string): TasksCommand {
  if (argument.trim() !== "") {
    return onStep(tasks, argument, "complete");
  }
  const next = nextTasksStep(tasks);
  if (next === undefined) {
    return problem({ kind: "no-step", step: undefined });
  }
  return {
    kind: "change",
    operations: [{ op: "complete", step: next.number }],
  };
}

function editCommand(tasks: Tasks, argument: string): TasksCommand {
  const { step: named, rest } = split(argument);
  const step = stepNumber(tasks, named);
  if (step === undefined) {
    return problem({ kind: "no-step", step: named });
  }
  const text = stepText("edit", rest);
  if (typeof text !== "string") {
    return problem(text);
  }
  return { kind: "change", operations: [{ op: "change", step, text }] };
}

function moveCommand(tasks: Tasks, argument: string): TasksCommand {
  const { step: named, rest } = split(argument);
  const step = stepNumber(tasks, named);
  const most = tasks.steps.filter((open) => !open.done).length;
  if (step === undefined) {
    return problem({ kind: "no-step", step: named });
  }
  const operation = moveToPlace(tasks, step, Number(rest.trim()));
  if (operation === undefined || rest.trim() === "") {
    return problem({ kind: "no-place", most });
  }
  return { kind: "change", operations: [operation] };
}

// What the command text asks of the tasks as they are.
function parseTasksCommand(text: string, tasks: Tasks): TasksCommand {
  const { name = "", argument = "" } =
    COMMAND_LINE.exec(text.trim())?.groups ?? {};
  const { data: known } = TASKS_COMMAND_NAME.safeParse(name);
  if (known === undefined) {
    return problem({ kind: "unknown", name });
  }
  switch (known) {
    case "tasks":
      return { kind: "show" };
    case "undo":
      return { kind: "undo" };
    case "add":
      return addCommand(argument);
    case "done":
      return doneCommand(tasks, argument);
    case "reopen":
      return onStep(tasks, argument, "reopen");
    case "drop":
      return onStep(tasks, argument, "remove");
    case "edit":
      return editCommand(tasks, argument);
    case "move":
      return moveCommand(tasks, argument);
    default:
      return known satisfies never;
  }
}

export type { CommandProblem, TasksCommandName };
export {
  isChatCommand,
  parseTasksCommand,
  TASKS_COMMAND_NAMES,
  TASKS_COMMAND_USAGE,
};
