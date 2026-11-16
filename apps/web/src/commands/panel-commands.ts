// The chat's commands beyond the tasks commands (src/tasks/tasks-commands.ts)
// and the quest status commands (src/quests/quest-status-commands.ts): for
// Ideas, Quick Notes, the progress timeline, the quest's members, Start Day
// and starting the conversation. Each quest panel control
// sends one of them, or a tasks command, to the conversation, as if the user
// had typed it, so the conversation records what was done to the quest. It
// imports nothing from the server, because the panel and the composer in the
// browser write and list the same commands.
//
// A command names an idea, a Quick Note or a milestone by its place in its
// list as the panel shows it, 1 being first; and a person by their name as
// Members shows it.

import { z } from "zod";

// The commands' names, in the order the composer lists them.
const PANEL_COMMAND_NAMES = [
  "idea",
  "edit-idea",
  "move-idea",
  "drop-idea",
  "idea-to-tasks",
  "edit-note",
  "drop-note",
  "edit-milestone",
  "drop-milestone",
  "start-day",
  "undo-start-day",
  "invite",
  "withdraw",
  "remove",
  "leave",
  "start",
] as const;

type PanelCommandName = (typeof PANEL_COMMAND_NAMES)[number];

const PANEL_COMMAND_NAME = z.enum(PANEL_COMMAND_NAMES);

// How each command is written, its arguments as placeholders.
const PANEL_COMMAND_USAGE: Readonly<Record<PanelCommandName, string>> = {
  idea: "/idea TEXT",
  "edit-idea": "/edit-idea IDEA TEXT",
  "move-idea": "/move-idea IDEA PLACE",
  "drop-idea": "/drop-idea IDEA",
  "idea-to-tasks": "/idea-to-tasks IDEA",
  "edit-note": "/edit-note NOTE TEXT",
  "drop-note": "/drop-note NOTE",
  "edit-milestone": "/edit-milestone MILESTONE TEXT",
  "drop-milestone": "/drop-milestone MILESTONE",
  "start-day": "/start-day [clear-tasks] [clear-ideas]",
  "undo-start-day": "/undo-start-day",
  invite: "/invite EMAIL",
  withdraw: "/withdraw EMAIL",
  remove: "/remove NAME",
  leave: "/leave",
  start: "/start",
};

// The commands whose name alone is a whole command, which Enter in the
// composer runs rather than completes.
const WHOLE_PANEL_COMMANDS: readonly PanelCommandName[] = [
  "start-day",
  "undo-start-day",
  "leave",
  "start",
];

// The words /start-day takes, each removing everything of one kind.
const START_DAY_CLEAR_TASKS = "clear-tasks";
const START_DAY_CLEAR_IDEAS = "clear-ideas";

// The command name, as typed after "/", or undefined if it names none of
// these commands.
function panelCommandName(name: string): PanelCommandName | undefined {
  return PANEL_COMMAND_NAME.safeParse(name).data;
}

// What Start Day removes, besides starting the day.
interface StartDayClearing {
  readonly clearTasks: boolean;
  readonly clearIdeas: boolean;
}

// The text of each command, as a panel control sends it. place is the
// item's place in its list, 1 being first.
const PANEL_COMMAND = {
  idea: (text: string): string => `/idea ${text}`,
  editIdea: (place: number, text: string): string =>
    `/edit-idea ${place} ${text}`,
  moveIdea: (place: number, to: number): string => `/move-idea ${place} ${to}`,
  dropIdea: (place: number): string => `/drop-idea ${place}`,
  ideaToTasks: (place: number): string => `/idea-to-tasks ${place}`,
  editNote: (place: number, text: string): string =>
    `/edit-note ${place} ${text}`,
  dropNote: (place: number): string => `/drop-note ${place}`,
  editMilestone: (place: number, text: string): string =>
    `/edit-milestone ${place} ${text}`,
  dropMilestone: (place: number): string => `/drop-milestone ${place}`,
  status: (
    to: "active" | "completed" | "abandoned",
  ): "/restore" | "/complete" | "/abandon" => {
    switch (to) {
      case "active":
        return "/restore";
      case "completed":
        return "/complete";
      case "abandoned":
        return "/abandon";
      default:
        return to satisfies never;
    }
  },
  startDay: ({ clearTasks, clearIdeas }: StartDayClearing): string => {
    const words = ["/start-day"];
    if (clearTasks) {
      words.push(START_DAY_CLEAR_TASKS);
    }
    if (clearIdeas) {
      words.push(START_DAY_CLEAR_IDEAS);
    }
    return words.join(" ");
  },
  undoStartDay: "/undo-start-day",
  invite: (email: string): string => `/invite ${email}`,
  withdraw: (email: string): string => `/withdraw ${email}`,
  remove: (name: string): string => `/remove ${name}`,
  leave: "/leave",
  start: "/start",
  cast: (spellName: string): string => `cast ${spellName}`,
  stop: "stop",
} as const;

// The place a list's drag or move control means, as a move command takes
// it: the place, 1 being first, that the item lands at among the others
// when it goes before the item with id before, or at the end without one.
// Undefined if the item or before isn't in ids.
function placeBefore(
  ids: readonly string[],
  id: string,
  before: string | undefined,
): number | undefined {
  if (!ids.includes(id)) {
    return undefined;
  }
  const others = ids.filter((other) => other !== id);
  if (before === undefined) {
    return others.length + 1;
  }
  const index = others.indexOf(before);
  if (index < 0) {
    return undefined;
  }
  return index + 1;
}

export type { PanelCommandName, StartDayClearing };
export {
  PANEL_COMMAND,
  PANEL_COMMAND_NAMES,
  PANEL_COMMAND_USAGE,
  panelCommandName,
  placeBefore,
  START_DAY_CLEAR_IDEAS,
  START_DAY_CLEAR_TASKS,
  WHOLE_PANEL_COMMANDS,
};
