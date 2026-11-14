// The text of a quest's plan: the Plan section on the quest's page and the
// Plan section, the Plan panel beside a quest's conversation, the plan
// changes and plan cards in it, and the composer's commands. The plan has no
// deadlines and never nags: no counts of open steps or days.

import {
  MOST_OPEN_STEPS,
  PLAN_STEP_TEXT_MAX_LENGTH,
  type PlanChangeLine,
} from "@/plan/plan.ts";
import type { CommandProblem, PlanCommandName } from "@/plan/plan-commands.ts";

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
function planLineText(line: PlanChangeLine): string {
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
    default:
      return line satisfies never;
  }
}

// What each built-in command does, as the composer's list shows it.
const PLAN_COMMAND_DESCRIPTIONS: Readonly<Record<PlanCommandName, string>> = {
  plan: "Start Plan; save subsequent messages as steps",
  add: "Add a step at the end",
  done: "Check off a step, or the next step",
  reopen: "Reopen a done step",
  edit: "Change a step's text",
  move: "Move an open step to a place, 1 being first",
  drop: "Remove a step",
  undo: "Undo your last plan change here",
};

export const PLAN_COPY = {
  heading: "Plan",
  intro:
    "The remaining work for this quest, in order. Your construct keeps it with you in the conversation, and you can change it here at any time.",
  nextStep: "Next step",
  allDone: "Every step is done. Add the next one when you're ready.",
  none: "No steps yet. Add one, or plan the next stretch with your construct in the conversation.",
  stepsLabel: "Open steps",
  stepNumber: (number: number): string => `#${number}`,
  checkOff: (text: string): string => `Check off ${quoted(text)}`,
  reopen: (text: string): string => `Reopen ${quoted(text)}`,
  completeNext: "Done",
  completeNextLabel: (text: string): string =>
    `Check off the next step, ${quoted(text)}`,
  moveUp: (text: string): string => `Move ${quoted(text)} up`,
  moveDown: (text: string): string => `Move ${quoted(text)} down`,
  edit: (text: string): string => `Edit ${quoted(text)}`,
  remove: (text: string): string => `Remove ${quoted(text)}`,
  actions: (text: string): string => `Actions for ${quoted(text)}`,
  moveUpLabel: "Move up",
  moveDownLabel: "Move down",
  removeLabel: "Remove step",
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
  undone: "Undone.",
  failed: {
    "missing-step":
      "That step isn't in the plan any more. The plan now shows the latest steps.",
    "too-many-steps": `The plan holds ${MOST_OPEN_STEPS} open steps at most. Finish or remove one first.`,
    unchanged: "Nothing changed.",
    "already-undone": "That change was undone already.",
    "no-such-change": "There's no change to undo.",
    "nothing-to-undo":
      "Everything that change did was changed or removed since, so there's nothing left to undo.",
    "awaiting-reply":
      "Your last message is waiting for a reply. Change the plan here once it has one, or on the quest's page now.",
    "not-found": "This quest isn't available any more.",
    "not-saved": "The plan couldn't be saved. Try again.",
  },
} as const;

export const PLAN_CHANGE_COPY = {
  label: "Plan change",
  undid: "Undid a plan change",
  undo: "Undo",
  undoLabel: "Undo this plan change",
  undone: "Undone",
  noModel: "Plan change",
  notChanged: "The plan didn't change.",
  cardLabel: "Plan card",
  sideMenu: "The Plan controls are in the quest side menu.",
  staleCard: "Plan card. The plan is shown again further down.",
} as const;

export const PLAN_PANEL_COPY = {
  label: "Plan",
  toggle: "Plan",
  next: (text: string): string => `Next: ${text}`,
  busy: (constructName: string): string =>
    `${constructName} is replying. You can change the plan once the reply ends.`,
  unanswered:
    "Your last message has no reply yet. Retry it or send another message, then change the plan here. You can change it on the quest's page now.",
  questPage: "Open the quest's plan",
} as const;

export const CHAT_COMMANDS_COPY = {
  listLabel: "Commands",
  hint: "Commands run at once. Steps are named by their numbers, such as #3.",
  description: (name: PlanCommandName): string =>
    PLAN_COMMAND_DESCRIPTIONS[name],
  noPlan: "Plan commands work in a quest's conversation. Chat has no quest.",
  problem: (found: CommandProblem): string => {
    switch (found.kind) {
      case "unknown":
        return `There's no /${found.name} command. Type / to see the commands.`;
      case "no-text":
        return `Write the step after /${found.name}.`;
      case "too-long":
        return `Keep a step to one line of at most ${PLAN_STEP_TEXT_MAX_LENGTH} characters.`;
      case "no-step":
        if (found.step === undefined) {
          return "Name a step by its number, such as /done 3.";
        }
        return `The plan has no step ${found.step}. Type /plan to see the steps and their numbers.`;
      case "no-place":
        return `Write /move, the step's number, then its new place from 1 to ${found.most}.`;
      default:
        return found satisfies never;
    }
  },
  failed: "The command couldn't run. Try again.",
} as const;

export { planLineText };
