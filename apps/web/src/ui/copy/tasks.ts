// The text of a quest's tasks: the Tasks section on the quest's page and the
// Tasks section, the Tasks panel beside a quest's conversation, the tasks
// changes and tasks cards in it, and the composer's commands. The tasks have no
// deadlines.

import type { StreakChain } from "@/dailies/dailies.ts";
import { TASK_TEXT_MAX_LENGTH, type TasksChangeLine } from "@/tasks/tasks.ts";
import type {
  CommandProblem,
  TasksCommandName,
} from "@/tasks/tasks-commands.ts";

// A streak's length, such as "3-day streak".
function streak(count: number): string {
  return `${count}-day streak`;
}

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
      return `Made ${quoted(line.text)} a one-off task`;
    default:
      return line satisfies never;
  }
}

// What each built-in command does, as the composer's list shows it.
const TASKS_COMMAND_DESCRIPTIONS: Readonly<Record<TasksCommandName, string>> = {
  tasks: "Start Tasks; save subsequent messages as tasks",
  add: "Add a task at the end",
  done: "Check off a task, or the next task",
  reopen: "Reopen a done task",
  edit: "Change a task's text",
  move: "Move an open task to a place, 1 being first",
  drop: "Remove a task",
  recur: "Make a task recurring, in Dailies",
  once: "Make a recurring task a one-off task",
  undo: "Undo your last tasks change here",
};

export const TASKS_COPY = {
  heading: "Tasks",
  intro: "Agreed work. One step at a time.",
  tasksLabel: "Open tasks",
  openSummary: (count: number): string => `${count} open · Agreed work`,
  empty: "No open tasks. Add the next piece of agreed work.",
  taskNumber: (number: number): string => `#${number}`,
  checkOff: (text: string): string => `Check off ${quoted(text)}`,
  reopen: (text: string): string => `Reopen ${quoted(text)}`,
  moveUp: (text: string): string => `Move ${quoted(text)} up`,
  moveDown: (text: string): string => `Move ${quoted(text)} down`,
  edit: (text: string): string => `Edit ${quoted(text)}`,
  remove: (text: string): string => `Remove ${quoted(text)}`,
  actions: (text: string): string => `Actions for ${quoted(text)}`,
  moveUpLabel: "Move up",
  moveDownLabel: "Move down",
  removeLabel: "Remove task",
  makeRecurring: (text: string): string => `Make ${quoted(text)} recurring`,
  makeOneOff: (text: string): string => `Make ${quoted(text)} a one-off task`,
  makeRecurringLabel: "Make recurring",
  makeOneOffLabel: "Make one-off",
  streak,
  // The line under a recurring task's streak chain: the streak, and what
  // checking the task off does next.
  streakNote: ({
    streak: count,
    doneToday,
    milestone,
  }: StreakChain): string => {
    if (count === 0) {
      return "Check it off to start a streak.";
    }
    if (!doneToday) {
      return `${streak(count)}. Check it off to make it ${count + 1}.`;
    }
    if (count === milestone) {
      return `${streak(count)}. Milestone reached.`;
    }
    return `${streak(count)}. ${milestone - count} more to ${milestone}.`;
  },
  recurring: "Recurring",
  recurringNoStreak: "Recurring, no streak",
  textLabel: "Task",
  save: "Save",
  cancel: "Cancel",
  addLabel: "New task",
  addPlaceholder: "Add a task",
  add: "Add",
  done: (count: number): string => `Done (${count})`,
  needsText: "A task needs some text.",
  tooLong: (maxLength: number): string =>
    `Keep a task to one line of at most ${maxLength} characters.`,
  undo: "Undo",
  failed: {
    "missing-task":
      "That task isn't in Tasks any more. The latest tasks are shown.",
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
  commandNote: "Command",
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
  hint: "Commands run at once. Tasks are named by their numbers, such as #3.",
  description: (name: TasksCommandName): string =>
    TASKS_COMMAND_DESCRIPTIONS[name],
  problem: (found: CommandProblem): string => {
    switch (found.kind) {
      case "unknown":
        return `There's no /${found.name} command. Type / to see the commands.`;
      case "no-text":
        return `Write the task after /${found.name}.`;
      case "too-long":
        return `Keep a task to one line of at most ${TASK_TEXT_MAX_LENGTH} characters.`;
      case "no-task":
        if (found.task === undefined) {
          return "Name a task by its number, such as /done 3.";
        }
        return `There is no task ${found.task}. Type /tasks to see the tasks and their numbers.`;
      case "no-place":
        return `Write /move, the task's number, then its new place from 1 to ${found.most}.`;
      default:
        return found satisfies never;
    }
  },
  failed: "The command couldn't run. Try again.",
} as const;

export { tasksLineText };
