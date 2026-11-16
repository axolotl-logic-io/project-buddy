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
  { name: "task", summary: "Read and change a quest's Tasks." },
  { name: "idea", summary: "Read and change a quest's Ideas." },
  { name: "note", summary: "Read, add and remove a quest's Quick Notes." },
  { name: "milestone", summary: "Read, edit and remove a quest's milestones." },
  { name: "construct", summary: "List the constructs open to you." },
  { name: "spell", summary: "List spells, and cast or stop one in a quest." },
  {
    name: "conversation",
    summary: "Read a quest's conversation and send it a message.",
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

// A number counted from 1, such as a step number or a Tasks version.
function countingNumber(value: string, field: string): number {
  const number = wholeNumber(value, field);
  if (number < 1) {
    throw new InputProblem(`${field} must be a whole number from 1.`, {
      field,
    });
  }
  return number;
}

// The step the optional --before names.
function beforeStep(input: CommandInput): number | undefined {
  const before = input.options.get("before");
  if (before === undefined) {
    return undefined;
  }
  return countingNumber(before, "before");
}

// An ID as one path segment.
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

// One change to the quest's Tasks.
function tasksChange(input: CommandInput, operation: unknown): ApiRequest {
  return {
    method: "POST",
    path: `${questPath(input)}/tasks`,
    body: { operations: [operation] },
  };
}

// A change to one step that names only the step: complete, reopen or
// remove.
function stepCommand(action: string, summary: string): Command {
  return command({
    resource: "task",
    action,
    usage: `task ${action} STEP --quest QUEST_ID`,
    summary,
    target: true,
    options: ["quest"],
    request: (input: CommandInput): ApiRequest =>
      tasksChange(input, {
        op: action,
        step: countingNumber(targetOf(input, "step"), "step"),
      }),
  });
}

// One change to the quest's Ideas.
function ideaChange(input: CommandInput, change: object): ApiRequest {
  return { method: "POST", path: `${questPath(input)}/ideas`, body: change };
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

// List the definitions of a kind, constructs or spells, and get one by ID.
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
    summary: "Show a quest, with its status revision and conversation ID.",
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

const TASK_COMMANDS: readonly Command[] = [
  command({
    resource: "task",
    action: "list",
    usage: "task list --quest QUEST_ID",
    summary: "List the quest's steps in order, with the Tasks version.",
    options: ["quest"],
    list: true,
    request: (input: CommandInput): ApiRequest => ({
      method: "GET",
      path: `${questPath(input)}/tasks`,
    }),
  }),
  command({
    resource: "task",
    action: "add",
    usage:
      "task add --quest QUEST_ID (--text TEXT | --text-file PATH | --stdin) [--before STEP]",
    summary: "Add a step, at the end or before another step.",
    options: ["quest", "text", "before"],
    request: (input: CommandInput): ApiRequest =>
      tasksChange(input, {
        op: "add",
        text: textOf(input),
        before: beforeStep(input),
      }),
  }),
  command({
    resource: "task",
    action: "edit",
    usage:
      "task edit STEP --quest QUEST_ID (--text TEXT | --text-file PATH | --stdin)",
    summary: "Change a step's text.",
    target: true,
    options: ["quest", "text"],
    request: (input: CommandInput): ApiRequest =>
      tasksChange(input, {
        op: "change",
        step: countingNumber(targetOf(input, "step"), "step"),
        text: textOf(input),
      }),
  }),
  stepCommand("complete", "Mark a step done."),
  stepCommand("reopen", "Mark a done step not done."),
  command({
    resource: "task",
    action: "move",
    usage: "task move STEP --quest QUEST_ID [--before STEP]",
    summary: "Move a step to the end, or before another step.",
    target: true,
    options: ["quest", "before"],
    request: (input: CommandInput): ApiRequest =>
      tasksChange(input, {
        op: "move",
        step: countingNumber(targetOf(input, "step"), "step"),
        before: beforeStep(input),
      }),
  }),
  stepCommand("remove", "Remove a step."),
  command({
    resource: "task",
    action: "undo",
    usage: "task undo CHANGE_VERSION --quest QUEST_ID",
    summary:
      "Undo the change that made a Tasks version, as the site's undo does.",
    target: true,
    options: ["quest"],
    request: (input: CommandInput): ApiRequest => ({
      method: "POST",
      path: `${questPath(input)}/tasks/undo`,
      body: {
        version: countingNumber(targetOf(input, "change version"), "version"),
      },
    }),
  }),
];

const IDEA_COMMANDS: readonly Command[] = [
  questList("idea", "ideas", "List the quest's ideas in order."),
  command({
    resource: "idea",
    action: "add",
    usage:
      "idea add --quest QUEST_ID (--text TEXT | --text-file PATH | --stdin)",
    summary: "Add an idea.",
    options: ["quest", "text"],
    request: (input: CommandInput): ApiRequest =>
      ideaChange(input, { op: "add", text: textOf(input) }),
  }),
  command({
    resource: "idea",
    action: "edit",
    usage:
      "idea edit IDEA_ID --quest QUEST_ID (--text TEXT | --text-file PATH | --stdin)",
    summary: "Change an idea's text.",
    target: true,
    options: ["quest", "text"],
    request: (input: CommandInput): ApiRequest =>
      ideaChange(input, {
        op: "edit",
        id: targetOf(input, "idea"),
        text: textOf(input),
      }),
  }),
  command({
    resource: "idea",
    action: "move",
    usage: "idea move IDEA_ID --quest QUEST_ID [--before IDEA_ID]",
    summary: "Move an idea to the end, or before another idea.",
    target: true,
    options: ["quest", "before"],
    request: (input: CommandInput): ApiRequest =>
      ideaChange(input, {
        op: "reorder",
        id: targetOf(input, "idea"),
        before: input.options.get("before"),
      }),
  }),
  command({
    resource: "idea",
    action: "remove",
    usage: "idea remove IDEA_ID --quest QUEST_ID",
    summary: "Remove an idea.",
    target: true,
    options: ["quest"],
    request: (input: CommandInput): ApiRequest =>
      ideaChange(input, { op: "remove", id: targetOf(input, "idea") }),
  }),
  command({
    resource: "idea",
    action: "to-tasks",
    usage: "idea to-tasks IDEA_ID --quest QUEST_ID",
    summary: "Move an idea to the end of Tasks, in one change.",
    target: true,
    options: ["quest"],
    request: (input: CommandInput): ApiRequest =>
      ideaChange(input, { op: "move", id: targetOf(input, "idea") }),
  }),
];

const NOTE_COMMANDS: readonly Command[] = [
  questList("note", "notes", "List the quest's Quick Notes."),
  command({
    resource: "note",
    action: "add",
    usage:
      "note add --quest QUEST_ID (--text TEXT | --text-file PATH | --stdin)",
    summary: "Add a Quick Note to an active quest.",
    options: ["quest", "text"],
    request: (input: CommandInput): ApiRequest => ({
      method: "POST",
      path: `${questPath(input)}/notes`,
      body: { text: textOf(input) },
    }),
  }),
  command({
    resource: "note",
    action: "remove",
    usage: "note remove NOTE_ID --quest QUEST_ID",
    summary: "Remove a Quick Note. Removing it again changes nothing.",
    target: true,
    options: ["quest"],
    request: (input: CommandInput): ApiRequest => ({
      method: "DELETE",
      path: `${questPath(input)}/notes/${segment(targetOf(input, "note"))}`,
    }),
  }),
];

const MILESTONE_COMMANDS: readonly Command[] = [
  questList("milestone", "milestones", "List the quest's milestones."),
  command({
    resource: "milestone",
    action: "edit",
    usage:
      "milestone edit MILESTONE_ID (--text TEXT | --text-file PATH | --stdin)",
    summary: "Change a milestone's text.",
    target: true,
    options: ["text"],
    request: (input: CommandInput): ApiRequest => ({
      method: "PATCH",
      path: `/milestones/${segment(targetOf(input, "milestone"))}`,
      body: { text: textOf(input) },
    }),
  }),
  command({
    resource: "milestone",
    action: "remove",
    usage: "milestone remove MILESTONE_ID",
    summary: "Remove a milestone. Removing it again changes nothing.",
    target: true,
    request: (input: CommandInput): ApiRequest => ({
      method: "DELETE",
      path: `/milestones/${segment(targetOf(input, "milestone"))}`,
    }),
  }),
];

const SPELL_COMMANDS: readonly Command[] = [
  ...definitionCommands("spell", "spells"),
  command({
    resource: "spell",
    action: "cast",
    usage: "spell cast --quest QUEST_ID --spell SPELL_ID",
    summary: "Cast a spell in the quest's conversation.",
    options: ["quest", "spell"],
    request: (input: CommandInput): ApiRequest => ({
      method: "PUT",
      path: `${questPath(input)}/conversation/spell`,
      body: { spell: required(input, "spell") },
    }),
  }),
  command({
    resource: "spell",
    action: "stop",
    usage: "spell stop --quest QUEST_ID",
    summary: "Stop the spell active in the quest's conversation.",
    options: ["quest"],
    request: (input: CommandInput): ApiRequest => ({
      method: "DELETE",
      path: `${questPath(input)}/conversation/spell`,
    }),
  }),
];

const CONVERSATION_COMMANDS: readonly Command[] = [
  command({
    resource: "conversation",
    action: "get",
    usage: "conversation get --quest QUEST_ID",
    summary:
      "Show the quest's conversation: its messages, active spell and whether it awaits a reply.",
    options: ["quest"],
    request: (input: CommandInput): ApiRequest => ({
      method: "GET",
      path: `${questPath(input)}/conversation`,
    }),
  }),
  command({
    resource: "conversation",
    action: "send",
    usage:
      "conversation send --quest QUEST_ID (--text TEXT | --text-file PATH | --stdin)",
    summary:
      "Send the quest's construct a message and wait for its reply. Starts the conversation if the quest has none.",
    options: ["quest", "text"],
    timeoutSeconds: REPLY_TIMEOUT_SECONDS,
    request: (input: CommandInput): ApiRequest => ({
      method: "POST",
      path: `${questPath(input)}/conversation/messages`,
      body: { text: textOf(input) },
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
  ...TASK_COMMANDS,
  ...IDEA_COMMANDS,
  ...NOTE_COMMANDS,
  ...MILESTONE_COMMANDS,
  ...definitionCommands("construct", "constructs"),
  ...SPELL_COMMANDS,
  ...CONVERSATION_COMMANDS,
];

// The command's name as records give it, such as "quest list".
function commandName(found: Command): string {
  return [found.resource, found.action].filter(Boolean).join(" ");
}

export type { Command, CommandInput, Resource };
export { COMMANDS, commandName, RESOURCES };
