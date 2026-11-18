import type { PanelCommandName } from "@/commands/panel-commands.ts";
import { IDEA_TEXT_MAX_LENGTH } from "@/ideas/idea.ts";

const PANEL_COMMAND_DESCRIPTIONS: Readonly<Record<PanelCommandName, string>> = {
  idea: "Add an idea to Ideas",
  "edit-idea": "Change an idea's text, naming it by its place in Ideas",
  "move-idea": "Move an idea to a new place in Ideas",
  "drop-idea": "Remove an idea from Ideas",
  "idea-to-tasks": "Move an idea from Ideas to the Tasks",
  "edit-note":
    "Change a Quick Note’s text, naming it by its place, newest first",
  "drop-note": "Delete a Quick Note, naming it by its place, newest first",
  "edit-milestone":
    "Change a milestone's text, naming it by its place in Progress, newest first",
  "drop-milestone": "Delete a milestone from Progress",
  "start-day":
    "Start a new day in Dailies, clearing the tasks or Ideas if asked",
  "undo-start-day": "Take back the newest Start Day",
  invite: "Invite someone to this quest by email",
  withdraw: "Withdraw the invitation sent to an address",
  remove: "Remove a member from this quest, by name",
  leave: "Leave this quest",
  start: "Start this quest's conversation",
};

// Why a panel command did nothing, as the composer shows it.
const PANEL_COMMANDS_COPY = {
  description: (name: PanelCommandName): string =>
    PANEL_COMMAND_DESCRIPTIONS[name],
  // What the conversation shows under a command that ran, and what the
  // construct reads of it.
  notes: {
    idea: (text: string): string => `Added the idea “${text}” to Ideas.`,
    editIdea: (place: number, text: string): string =>
      `Changed idea ${place} to “${text}”.`,
    moveIdea: (text: string, place: number): string =>
      `Moved the idea “${text}” to place ${place} in Ideas.`,
    dropIdea: (text: string): string =>
      `Removed the idea “${text}” from Ideas.`,
    ideaToTasks: (text: string): string =>
      `Moved the idea “${text}” to the Tasks.`,
    editNote: (place: number, text: string): string =>
      `Changed Quick Note ${place} to “${text}”.`,
    dropNote: (text: string): string => `Deleted the Quick Note “${text}”.`,
    editMilestone: (place: number, text: string): string =>
      `Changed milestone ${place} in Progress to “${text}”.`,
    dropMilestone: (text: string): string =>
      `Deleted the milestone “${text}” from Progress.`,
    startDay: (cleared: readonly string[]): string => {
      if (cleared.length === 0) {
        return "Started a new day.";
      }
      return `Started a new day and cleared the ${cleared.join(" and the ")}.`;
    },
    undoStartDay: "Took back the newest Start Day.",
    invited: (email: string): string => `Invited ${email} to this quest.`,
    unsent: (email: string): string =>
      `Saved the invitation for ${email}, but the email couldn't be sent. Withdraw it and invite them again.`,
    withdrawn: (email: string): string =>
      `Withdrew the invitation sent to ${email}.`,
    removed: (name: string): string => `Removed ${name} from this quest.`,
    left: "Left this quest.",
    started: "Started the conversation.",
    status: {
      active: "Restored the quest.",
      completed: "Completed the quest.",
      abandoned: "Abandoned the quest.",
    },
  },
  clearedTasks: "tasks",
  clearedIdeas: "Ideas",
  problems: {
    noText: (name: PanelCommandName): string =>
      `Write the text after /${name}.`,
    ideaTooLong: `Keep an idea to at most ${IDEA_TEXT_MAX_LENGTH} characters.`,
    noIdea: (most: number): string => {
      if (most === 0) {
        return "There are no ideas yet. Add one with /idea.";
      }
      return `Name an idea by its place in Ideas, from 1 to ${most}.`;
    },
    noIdeaPlace: (most: number): string =>
      `Write /move-idea, the idea's place, then its new place from 1 to ${most}.`,
    noNote: (most: number): string => {
      if (most === 0) {
        return "This quest has no Quick Notes.";
      }
      return `Name a Quick Note by its place, newest first, from 1 to ${most}.`;
    },
    noMilestone: (most: number): string => {
      if (most === 0) {
        return "This quest has no milestones yet.";
      }
      return `Name a milestone by its place in Progress, newest first, from 1 to ${most}.`;
    },
    startDayWords:
      "Write /start-day alone, or with clear-tasks, clear-ideas or both.",
    notDailies: "Start Day is only in the Dailies quest, while it is Active.",
    dayChanged: "The day has changed. Check Dailies and try again.",
    cantUndoStartDay:
      "There's no Start Day to take back, or someone has written in the new day's conversation.",
    noEmail: "Write an email address after /invite, such as name@example.com.",
    noInvitation: (email: string): string =>
      `There's no invitation for ${email}. Members lists the invitations.`,
    noMember: (name: string): string =>
      `There's no member named ${name}. Members lists the members.`,
    sameName: (name: string): string =>
      `More than one member is named ${name}. Remove them from Members.`,
    removeSelf: "To leave this quest, use /leave.",
    owner: "The quest's owner can't leave it or be removed.",
    dailies: "Dailies is yours alone, so no one can be invited to it.",
    started: "This conversation has already started.",
    takesNothing: (name: PanelCommandName): string =>
      `/${name} takes nothing after it.`,
    awaitingReply:
      "Wait for the reply to your last message, or stop it, then try again.",
    noConversation: "Open the quest's conversation to do this.",
    failed: "That couldn't be sent to the conversation. Try again.",
  },
} as const;

export { PANEL_COMMANDS_COPY };
