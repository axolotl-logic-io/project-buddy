// The commands, `project-buddy RESOURCE ACTION [TARGET] [options]`, and the
// API request each makes. A command reads only its own inputs here; the
// site applies the domain's rules and answers any problem with them.

import type { ApiRequest } from "./api-client.ts";
import type { CommandOption } from "./arguments.ts";
import { InputProblem } from "./problems.ts";

// What a command is given: its target positional, if any, its options, and
// the text from --text, --text-file or --stdin.
interface CommandInput {
  readonly target: string | undefined;
  readonly options: ReadonlyMap<CommandOption, string>;
  readonly text: string | undefined;
}

// One command: its name, how to use it, what it does, the options it
// takes, whether it takes a target, whether it answers with a list, and
// the request it makes.
interface Command {
  readonly resource: string;
  readonly action: string;
  readonly usage: string;
  readonly summary: string;
  readonly options: readonly CommandOption[];
  readonly target: boolean;
  readonly list: boolean;
  readonly timeoutSeconds: number;
  readonly request: (input: CommandInput) => ApiRequest;
}

// What resources are, for help.
interface Resource {
  readonly name: string;
  readonly summary: string;
}

const DEFAULT_TIMEOUT_SECONDS = 30;

// A reply can take a while: as long as the site lets it run.
const REPLY_TIMEOUT_SECONDS = 300;

const WHOLE_NUMBER = /^\d+$/u;

const RESOURCES: readonly Resource[] = [
  { name: "whoami", summary: "Show the signed-in user." },
  { name: "quest", summary: "List, start, rename and finish quests." },
  { name: "space", summary: "List and read spaces and undo changes." },
  { name: "murmling", summary: "Add and change a space's murmlings." },
  { name: "construct", summary: "List the constructs open to you." },
  { name: "rite", summary: "List the rites open to you." },
  {
    name: "performance",
    summary: "Start and stop performances and make conjurations.",
  },
];

function required(input: CommandInput, option: CommandOption): string {
  const value = input.options.get(option);
  if (value === undefined || value === "") {
    throw new InputProblem(`Give --${option}.`, { field: option });
  }
  return value;
}

function targetOf(input: CommandInput, label: string): string {
  if (input.target === undefined || input.target === "") {
    throw new InputProblem(`Give the ${label}.`, { field: label });
  }
  return input.target;
}

function textOf(input: CommandInput): string {
  if (input.text === undefined) {
    throw new InputProblem(
      "Give the text with one of --text, --text-file or --stdin.",
      { field: "text" },
    );
  }
  return input.text;
}

function wholeNumber(value: string, field: string): number {
  if (!WHOLE_NUMBER.test(value)) {
    throw new InputProblem(`${field} must be a whole number.`, { field });
  }
  return Number(value);
}

// A number counted from 1, such as a space version.
function countingNumber(value: string, field: string): number {
  const number = wholeNumber(value, field);
  if (number < 1) {
    throw new InputProblem(`${field} must be a whole number from 1.`, {
      field,
    });
  }
  return number;
}

function segment(id: string): string {
  return encodeURIComponent(id);
}

function questPath(input: CommandInput): string {
  return `/quests/${segment(required(input, "quest"))}`;
}

// A command with the defaults: no options, no target, one record, the
// usual deadline.
function command(
  spec: Pick<Command, "resource" | "action" | "usage" | "summary" | "request"> &
    Partial<Omit<Command, "resource" | "action" | "usage" | "summary">>,
): Command {
  return {
    options: [],
    target: false,
    list: false,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    ...spec,
  };
}

// A quest status change: complete, abandon or restore.
function statusCommand(
  action: string,
  status: string,
  summary: string,
): Command {
  return command({
    resource: "quest",
    action,
    usage: `quest ${action} QUEST_ID --revision REVISION`,
    summary,
    target: true,
    options: ["revision"],
    request: (input: CommandInput): ApiRequest => ({
      method: "POST",
      path: `/quests/${segment(targetOf(input, "quest"))}/status`,
      body: {
        status,
        revision: wholeNumber(required(input, "revision"), "revision"),
      },
    }),
  });
}

// A list under a quest.
function questList(resource: string, path: string, summary: string): Command {
  return command({
    resource,
    action: "list",
    usage: `${resource} list --quest QUEST_ID`,
    summary,
    options: ["quest"],
    list: true,
    request: (input: CommandInput): ApiRequest => ({
      method: "GET",
      path: `${questPath(input)}/${path}`,
    }),
  });
}

// List the definitions of a kind, constructs or rites, and get one by ID.
function definitionCommands(resource: string, path: string): Command[] {
  return [
    command({
      resource,
      action: "list",
      usage: `${resource} list`,
      summary: `List the built-in ${resource}s, then your own.`,
      list: true,
      request: (): ApiRequest => ({ method: "GET", path: `/${path}` }),
    }),
    command({
      resource,
      action: "get",
      usage: `${resource} get ${resource.toUpperCase()}_ID`,
      summary: `Show one ${resource}.`,
      target: true,
      request: (input: CommandInput): ApiRequest => ({
        method: "GET",
        path: `/${path}/${segment(targetOf(input, resource))}`,
      }),
    }),
  ];
}

const QUEST_COMMANDS: readonly Command[] = [
  command({
    resource: "quest",
    action: "list",
    usage: "quest list [--status active|completed|abandoned]",
    summary: "List the quests open to you, newest first.",
    options: ["status"],
    list: true,
    request: (input: CommandInput): ApiRequest => {
      const status = input.options.get("status");
      if (status === undefined) {
        return { method: "GET", path: "/quests" };
      }
      return { method: "GET", path: "/quests", query: { status } };
    },
  }),
  command({
    resource: "quest",
    action: "get",
    usage: "quest get QUEST_ID",
    summary: "Show a quest, with its status revision.",
    target: true,
    request: (input: CommandInput): ApiRequest => ({
      method: "GET",
      path: `/quests/${segment(targetOf(input, "quest"))}`,
    }),
  }),
  command({
    resource: "quest",
    action: "start",
    usage:
      "quest start --from dailies|learn|make|do [--name NAME] [--why TEXT] [--context TEXT]",
    summary:
      "Start a quest from a starting point, as the site does. Dailies resumes your Dailies quest if you have one.",
    options: ["from", "name", "why", "context"],
    timeoutSeconds: REPLY_TIMEOUT_SECONDS,
    request: (input: CommandInput): ApiRequest => ({
      method: "POST",
      path: "/quests",
      body: {
        from: required(input, "from"),
        name: input.options.get("name"),
        why: input.options.get("why"),
        context: input.options.get("context"),
      },
    }),
  }),
  command({
    resource: "quest",
    action: "rename",
    usage: "quest rename QUEST_ID --name NAME",
    summary: "Rename a quest.",
    target: true,
    options: ["name"],
    request: (input: CommandInput): ApiRequest => ({
      method: "PATCH",
      path: `/quests/${segment(targetOf(input, "quest"))}`,
      body: { name: required(input, "name") },
    }),
  }),
  statusCommand("complete", "completed", "Complete an active quest."),
  statusCommand("abandon", "abandoned", "Abandon an active quest."),
  statusCommand("restore", "active", "Make a finished quest active again."),
];

function spacePath(input: CommandInput, id: string): string {
  return `${questPath(input)}/spaces/${segment(id)}`;
}

function writeSpace(input: CommandInput, body: object): ApiRequest {
  return {
    method: "POST",
    path: spacePath(input, required(input, "space")),
    body,
  };
}

interface MurmlingCommand {
  readonly action: string;
  readonly summary: string;
  readonly options?: readonly CommandOption[];
  readonly extra?: string;
  readonly body: (input: CommandInput) => object;
}

function murmlingCommand({
  action,
  summary,
  options = [],
  extra = "",
  body,
}: MurmlingCommand): Command {
  return command({
    resource: "murmling",
    action,
    summary,
    target: true,
    usage: `murmling ${action} MURMLING_ID --quest QUEST_ID --space SPACE_ID${extra}`,
    options: ["quest", "space", ...options],
    request: (input: CommandInput): ApiRequest =>
      writeSpace(input, { id: targetOf(input, "murmling"), ...body(input) }),
  });
}

const SPACE_COMMANDS: readonly Command[] = [
  questList("space", "spaces", "List the quest's spaces in order."),
  command({
    resource: "space",
    action: "get",
    summary: "Read a space and its murmlings.",
    usage: "space get SPACE_ID --quest QUEST_ID",
    target: true,
    options: ["quest"],
    request: (input: CommandInput): ApiRequest => ({
      method: "GET",
      path: spacePath(input, targetOf(input, "space")),
    }),
  }),
  command({
    resource: "space",
    action: "undo",
    summary: "Undo the change recorded at a space version.",
    usage: "space undo VERSION --quest QUEST_ID --space SPACE_ID",
    target: true,
    options: ["quest", "space"],
    request: (input: CommandInput): ApiRequest =>
      writeSpace(input, {
        kind: "undo",
        version: countingNumber(targetOf(input, "version"), "version"),
      }),
  }),
  command({
    resource: "murmling",
    action: "add",
    summary: "Add a murmling to a space.",
    usage:
      "murmling add --quest QUEST_ID --space SPACE_ID (--text TEXT | --text-file PATH | --stdin) [--type TYPE]",
    options: ["quest", "space", "text", "type"],
    request: (input: CommandInput): ApiRequest =>
      writeSpace(input, {
        kind: "add",
        text: textOf(input),
        type: input.options.get("type"),
      }),
  }),
  murmlingCommand({
    action: "edit",
    summary: "Change a murmling's text.",
    options: ["text"],
    extra: " (--text TEXT | --text-file PATH | --stdin)",
    body: (input: CommandInput): object => ({
      kind: "edit",
      text: textOf(input),
    }),
  }),
  murmlingCommand({
    action: "check",
    summary: "Check off a task.",
    body: (): object => ({ kind: "check", checkedOff: true }),
  }),
  murmlingCommand({
    action: "uncheck",
    summary: "Uncheck a task.",
    body: (): object => ({ kind: "check", checkedOff: false }),
  }),
  murmlingCommand({
    action: "reorder",
    summary: "Place a murmling before another or at the end.",
    options: ["before"],
    extra: " [--before MURMLING_ID]",
    body: (input: CommandInput): object => ({
      kind: "place",
      before: input.options.get("before"),
    }),
  }),
  murmlingCommand({
    action: "move",
    summary: "Move a murmling to another space.",
    options: ["to"],
    extra: " --to SPACE_ID",
    body: (input: CommandInput): object => ({
      kind: "move",
      destination: required(input, "to"),
    }),
  }),
  murmlingCommand({
    action: "mark",
    summary: "Mark a murmling as plain, task or quick-note.",
    options: ["type"],
    extra: " --type TYPE",
    body: (input: CommandInput): object => ({
      kind: "type",
      type: required(input, "type"),
    }),
  }),
  murmlingCommand({
    action: "remove",
    summary: "Remove a murmling.",
    body: (): object => ({ kind: "remove" }),
  }),
];

function performancePath(input: CommandInput): string {
  return `${questPath(input)}/performances/${encodeURIComponent(targetOf(input, "performance"))}`;
}

const PERFORMANCE_COMMANDS: readonly Command[] = [
  command({
    resource: "performance",
    action: "list",
    usage: "performance list --quest QUEST_ID",
    summary: "List the quest's performances.",
    options: ["quest"],
    list: true,
    request: (input: CommandInput): ApiRequest => ({
      method: "GET",
      path: `${questPath(input)}/performances`,
    }),
  }),
  command({
    resource: "performance",
    action: "get",
    usage: "performance get PERFORMANCE_ID --quest QUEST_ID",
    summary: "Read a performance and its conjurations.",
    options: ["quest"],
    target: true,
    request: (input: CommandInput): ApiRequest => ({
      method: "GET",
      path: performancePath(input),
    }),
  }),
  command({
    resource: "performance",
    action: "start",
    usage: "performance start --quest QUEST_ID --rite RITE_ID --space SPACE_ID",
    summary: "Perform a rite on a space.",
    options: ["quest", "rite", "space"],
    request: (input: CommandInput): ApiRequest => ({
      method: "POST",
      path: `${questPath(input)}/performances`,
      body: {
        riteId: required(input, "rite"),
        spaceId: required(input, "space"),
      },
    }),
  }),
  command({
    resource: "performance",
    action: "conjure",
    usage:
      "performance conjure PERFORMANCE_ID --quest QUEST_ID (--text TEXT | --text-file PATH | --stdin)",
    summary: "Make a conjuration and receive its reply.",
    options: ["quest", "text"],
    target: true,
    request: (input: CommandInput): ApiRequest => ({
      method: "POST",
      path: performancePath(input),
      body: { id: crypto.randomUUID(), text: textOf(input) },
    }),
  }),
  command({
    resource: "performance",
    action: "stop",
    usage: "performance stop PERFORMANCE_ID --quest QUEST_ID",
    summary: "End the active performance.",
    options: ["quest"],
    target: true,
    request: (input: CommandInput): ApiRequest => ({
      method: "DELETE",
      path: performancePath(input),
    }),
  }),
];

const COMMANDS: readonly Command[] = [
  command({
    resource: "whoami",
    action: "",
    usage: "whoami",
    summary: "Show the user the session belongs to.",
    request: (): ApiRequest => ({ method: "GET", path: "/me" }),
  }),
  ...QUEST_COMMANDS,
  ...SPACE_COMMANDS,
  ...definitionCommands("construct", "constructs"),
  ...definitionCommands("rite", "rites"),
  ...PERFORMANCE_COMMANDS,
];

// The command's name as records give it, such as "quest list".
function commandName(found: Command): string {
  return [found.resource, found.action].filter(Boolean).join(" ");
}

export type { Command, CommandInput, Resource };
export { COMMANDS, commandName, RESOURCES };
