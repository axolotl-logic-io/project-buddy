// The text of a quest's tasks: the Tasks section on the quest's page and the
// Tasks section, the Tasks panel beside a quest's conversation, the tasks
// changes and tasks cards in it, and the composer's commands. The tasks have no
// deadlines.

import {
  TASKS_STEP_TEXT_MAX_LENGTH,
  type TasksChangeLine,
} from "@/tasks/tasks.ts";
import type {
  CommandProblem,
  TasksCommandName,
} from "@/tasks/tasks-commands.ts";

function quoted(text: string): string {
  return `“${text}”`;
}

function beforeOrEnd(before: string | undefined): string {
  if (before === undefined) {
    return "";
  }
  return ` before ${quoted(before)}`;
}

// One line of what a change did.
function tasksLineText(line: TasksChangeLine): string {
  switch (line.kind) {
    case "add":
      return `Added ${quoted(line.text)}${beforeOrEnd(line.before)}`;
    case "change":
      return `Changed ${quoted(line.from)} to ${quoted(line.text)}`;
    case "complete":
      return `Checked off ${quoted(line.text)}`;
    case "reopen":
      return `Reopened ${quoted(line.text)}`;
    case "move":
      if (line.before === undefined) {
        return `Moved ${quoted(line.text)} to the end`;
      }
      return `Moved ${quoted(line.text)}${beforeOrEnd(line.before)}`;
    case "remove":
      return `Removed ${quoted(line.text)}`;
    case "recur":
      if (line.recurring) {
        return `Made ${quoted(line.text)} recurring`;
      }
      return `Made ${quoted(line.text)} a one-off step`;
    default:
      return line satisfies never;
  }
}

// What each built-in command does, as the composer's list shows it.
const TASKS_COMMAND_DESCRIPTIONS: Readonly<Record<TasksCommandName, string>> = {
  tasks: "Start Tasks; save subsequent messages as steps",
  add: "Add a step at the end",
  done: "Check off a step, or the next step",
  reopen: "Reopen a done step",
  edit: "Change a step's text",
  move: "Move an open step to a place, 1 being first",
  drop: "Remove a step",
  undo: "Undo your last tasks change here",
};

export const TASKS_COPY = {
  heading: "Tasks",
  stepsLabel: "Open steps",
  stepNumber: (number: number): string => `#${number}`,
  checkOff: (text: string): string => `Check off ${quoted(text)}`,
  reopen: (text: string): string => `Reopen ${quoted(text)}`,
  moveUp: (text: string): string => `Move ${quoted(text)} up`,
  moveDown: (text: string): string => `Move ${quoted(text)} down`,
  edit: (text: string): string => `Edit ${quoted(text)}`,
  remove: (text: string): string => `Remove ${quoted(text)}`,
  actions: (text: string): string => `Actions for ${quoted(text)}`,
  moveUpLabel: "Move up",
  moveDownLabel: "Move down",
  removeLabel: "Remove step",
  makeRecurring: (text: string): string => `Make ${quoted(text)} recurring`,
  makeOneOff: (text: string): string => `Make ${quoted(text)} a one-off step`,
  makeRecurringLabel: "Make recurring",
  makeOneOffLabel: "Make one-off",
  // A recurring step's streak, as its badge shows it: the count, and the
  // rest for screen readers.
  streak: (count: number): string => {
    if (count === 1) {
      return "1-day streak";
    }
    return `${count}-day streak`;
  },
  recurringNoStreak: "Recurring, no streak",
  textLabel: "Step",
  save: "Save",
  cancel: "Cancel",
  addLabel: "New step",
  addPlaceholder: "Add a step",
  add: "Add",
  done: (count: number): string => `Done (${count})`,
  needsText: "A step needs some text.",
  tooLong: (maxLength: number): string =>
    `Keep a step to one line of at most ${maxLength} characters.`,
  undo: "Undo",
  failed: {
    "missing-step":
      "That step isn't in Tasks any more. The latest steps are shown.",
    unchanged: "Nothing changed.",
    "already-undone": "That change was undone already.",
    "no-such-change": "There's no change to undo.",
    "nothing-to-undo":
      "Everything that change did was changed or removed since, so there's nothing left to undo.",
    "awaiting-reply":
      "Your last message is waiting for a reply. Change the tasks here once it has one, or on the quest's page now.",
    "not-found": "This quest isn't available any more.",
    "not-saved": "The tasks couldn't be saved. Try again.",
  },
} as const;

export const TASKS_CHANGE_COPY = {
  label: "Tasks change",
  undid: "Undid a task change",
  undo: "Undo",
  undoLabel: "Undo this task change",
  undone: "Undone",
  noModel: "Tasks change",
  notChanged: "The tasks didn't change.",
  sideMenu: "The Tasks controls are in the quest side menu.",
} as const;

export const TASKS_PANEL_COPY = {
  busy: (constructName: string): string =>
    `${constructName} is replying. You can change the tasks once the reply ends.`,
  unanswered:
    "Your last message has no reply yet. Retry it or send another message, then change the tasks here. You can change it on the quest's page now.",
  notFound:
    "The tasks can't be changed here, because this quest can't be found or isn't open to you.",
} as const;

export const CHAT_COMMANDS_COPY = {
  listLabel: "Commands",
  hint: "Commands run at once. Steps are named by their numbers, such as #3.",
  description: (name: TasksCommandName): string =>
    TASKS_COMMAND_DESCRIPTIONS[name],
  problem: (found: CommandProblem): string => {
    switch (found.kind) {
      case "unknown":
        return `There's no /${found.name} command. Type / to see the commands.`;
      case "no-text":
        return `Write the step after /${found.name}.`;
      case "too-long":
        return `Keep a step to one line of at most ${TASKS_STEP_TEXT_MAX_LENGTH} characters.`;
      case "no-step":
        if (found.step === undefined) {
          return "Name a step by its number, such as /done 3.";
        }
        return `There is no task ${found.step}. Type /tasks to see the steps and their numbers.`;
      case "no-place":
        return `Write /move, the step's number, then its new place from 1 to ${found.most}.`;
      default:
        return found satisfies never;
    }
  },
  failed: "The command couldn't run. Try again.",
} as const;

export { tasksLineText };
