// Runs the chat's panel commands (panel-commands.ts) on the server, for the
// signed-in user in one of their quest's conversations, without a model.
// Each one that runs saves a command note to the conversation, written by the
// user: the command and what it did, so the conversation records it and the
// construct reads it. The note goes in after the change, except for /leave
// and /start-day, which take the user or the conversation away, so it goes
// in first; and /undo-start-day, which needs the new day's conversation empty,
// so it goes in the conversation that comes back.
//
// It calls refresh() and headers(), so only a Server Action may run it.

import { generateId } from "ai";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { linkOrigin } from "@/accounts/emailed-link.ts";
import { EMAIL_FIELD } from "@/app/login/link-request.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { type ChatMessage, withAuthor } from "@/chats/message-author.ts";
import {
  chatAwaitsReply,
  readMessageAuthor,
  saveTasksMessage,
} from "@/chats/store.ts";
import {
  type PanelCommandName,
  panelCommandName,
  START_DAY_CLEAR_IDEAS,
  START_DAY_CLEAR_TASKS,
} from "@/commands/panel-commands.ts";
import { dayDate } from "@/dailies/dailies.ts";
import { startDay, undoStartDay } from "@/dailies/day-store.ts";
import { IDEA_TEXT_MAX_LENGTH, type Idea } from "@/ideas/idea.ts";
import { changeIdea, listIdeas } from "@/ideas/idea-store.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import {
  MILESTONE_TEXT,
  MILESTONE_TEXT_MAX_LENGTH,
} from "@/milestones/milestone.ts";
import {
  deleteMilestone,
  editMilestone,
  listMilestones,
} from "@/milestones/milestone-store.ts";
import { checkNoteText } from "@/notes/note.ts";
import { deleteNote, editNote, listNotes } from "@/notes/note-store.ts";
import {
  inviteToQuest,
  listQuestPeople,
  removeFromQuest,
} from "@/quests/membership-store.ts";
import { getQuest } from "@/quests/store.ts";
import { HOME_PATH } from "@/routes.ts";
import { readCommandLine } from "@/tasks/tasks-commands.ts";
import { commandNoteMessage } from "@/tasks/tasks-message.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";

const WHITE_SPACE = /\s+/u;

// A place in a list, 1 being first, then the rest.
const PLACE_THEN_REST = /^(?<place>\d+)(?:\s+(?<rest>[\s\S]*))?$/u;

// What a panel command did: ran, with the note it saved, if it could be
// saved, and where the page goes next, if anywhere; or nothing, with why.
type PanelCommandResult =
  | {
      readonly kind: "noted";
      readonly note: string;
      readonly message?: ChatMessage | undefined;
      // The path the page opens, when the conversation shown is gone.
      readonly navigate?: string | undefined;
      // The name of the quest the user left, for Quests to say so.
      readonly leftQuest?: string | undefined;
    }
  | { readonly kind: "problem"; readonly text: string };

interface CommandContext {
  readonly user: UserId;
  readonly chat: Chat;
  readonly questId: QuestId;
  readonly name: PanelCommandName;
  readonly text: string;
  readonly argument: string;
  readonly localDate: string | undefined;
}

function problem(text: string): PanelCommandResult {
  return { kind: "problem", text };
}

// Saves the command and its note in the conversation, written by the user,
// and answers with the message as the conversation shows it; undefined if it
// couldn't be saved.
async function saveNote(
  user: UserId,
  chatId: ChatId,
  note: { readonly command: string; readonly note: string },
): Promise<ChatMessage | undefined> {
  const message = commandNoteMessage(generateId(), note);
  const [saved, author] = await Promise.all([
    saveTasksMessage(user, chatId, message),
    readMessageAuthor(user),
  ]);
  if (!saved) {
    return undefined;
  }
  if (author === undefined) {
    return message;
  }
  return withAuthor(message, author);
}

// The command ran: saves its note in the conversation and refreshes the
// page, which shows the change.
async function noted(
  context: CommandContext,
  note: string,
): Promise<PanelCommandResult> {
  const message = await saveNote(context.user, context.chat.id, {
    command: context.text,
    note,
  });
  refresh();
  return { kind: "noted", note, message };
}

// A place, 1 being first, in a list of length most; undefined if text is no
// such place.
function placeIn(text: string | undefined, most: number): number | undefined {
  const place = Number(text);
  if (
    text === undefined ||
    text === "" ||
    !Number.isInteger(place) ||
    place < 1 ||
    place > most
  ) {
    return undefined;
  }
  return place;
}

// The place argument starts with, and the rest on one line; written is the
// rest as written, line breaks and all.
function placeThenRest(argument: string): {
  readonly place: string | undefined;
  readonly rest: string;
  readonly written: string;
} {
  const { place, rest = "" } = PLACE_THEN_REST.exec(argument)?.groups ?? {};
  return {
    place,
    rest: rest.split(WHITE_SPACE).join(" ").trim(),
    written: rest.trim(),
  };
}

// The idea's text as Ideas saves it, or why it won't do.
function ideaText(
  name: PanelCommandName,
  text: string,
): { readonly text: string } | { readonly problem: string } {
  const oneLine = text.split(WHITE_SPACE).join(" ").trim();
  if (oneLine === "") {
    return { problem: PANEL_COMMANDS_COPY.problems.noText(name) };
  }
  if (oneLine.length > IDEA_TEXT_MAX_LENGTH) {
    return { problem: PANEL_COMMANDS_COPY.problems.ideaTooLong };
  }
  return { text: oneLine };
}

// The idea that argument's first word names, by its place, and the rest.
async function namedIdea(context: CommandContext): Promise<
  | {
      readonly idea: Idea;
      readonly place: number;
      readonly ideas: readonly Idea[];
      readonly rest: string;
    }
  | { readonly problem: string }
> {
  const ideas = await listIdeas(context.user, context.questId);
  const { place: named, rest } = placeThenRest(context.argument);
  const place = placeIn(named, ideas.length);
  const idea = ideas[(place ?? 0) - 1];
  if (place === undefined || idea === undefined) {
    return { problem: PANEL_COMMANDS_COPY.problems.noIdea(ideas.length) };
  }
  return { idea, place, ideas, rest };
}

async function ideaCommand(
  context: CommandContext,
): Promise<PanelCommandResult> {
  const { user, questId, name } = context;
  const { notes } = PANEL_COMMANDS_COPY;
  if (name === "idea") {
    const checked = ideaText(name, context.argument);
    if ("problem" in checked) {
      return problem(checked.problem);
    }
    const result = await changeIdea(user, {
      op: "add",
      questId,
      text: checked.text,
    });
    if (result.kind === "problem") {
      return problem(result.text);
    }
    return noted(context, notes.idea(checked.text));
  }
  const found = await namedIdea(context);
  if ("problem" in found) {
    return problem(found.problem);
  }
  const { idea, place, ideas, rest } = found;
  switch (name) {
    case "edit-idea": {
      const checked = ideaText(name, rest);
      if ("problem" in checked) {
        return problem(checked.problem);
      }
      const result = await changeIdea(user, {
        op: "edit",
        questId,
        id: idea.id,
        text: checked.text,
      });
      if (result.kind === "problem") {
        return problem(result.text);
      }
      return noted(context, notes.editIdea(place, checked.text));
    }
    case "move-idea": {
      const to = placeIn(rest, ideas.length);
      if (to === undefined) {
        return problem(PANEL_COMMANDS_COPY.problems.noIdeaPlace(ideas.length));
      }
      const others = ideas.filter((other) => other.id !== idea.id);
      const result = await changeIdea(user, {
        op: "reorder",
        questId,
        id: idea.id,
        before: others[to - 1]?.id,
      });
      if (result.kind === "problem") {
        return problem(result.text);
      }
      return noted(context, notes.moveIdea(idea.text, to));
    }
    default: {
      if (rest !== "") {
        return problem(PANEL_COMMANDS_COPY.problems.noIdea(ideas.length));
      }
      let op: "remove" | "move" = "move";
      let note = notes.ideaToTasks(idea.text);
      if (name === "drop-idea") {
        op = "remove";
        note = notes.dropIdea(idea.text);
      }
      const result = await changeIdea(user, { op, questId, id: idea.id });
      if (result.kind === "problem") {
        return problem(result.text);
      }
      return noted(context, note);
    }
  }
}

async function noteCommand(
  context: CommandContext,
): Promise<PanelCommandResult> {
  const notes = await listNotes(context.user, context.questId);
  const { place: named, rest, written } = placeThenRest(context.argument);
  const place = placeIn(named, notes.length);
  const note = notes[(place ?? 0) - 1];
  if (note === undefined) {
    return problem(PANEL_COMMANDS_COPY.problems.noNote(notes.length));
  }
  if (context.name === "edit-note") {
    const checked = checkNoteText(written);
    if ("problem" in checked) {
      return problem(QUICK_NOTE_COPY.problem(checked.problem));
    }
    if (
      !(await editNote(context.user, {
        questId: context.questId,
        id: note.id,
        text: checked.text,
      }))
    ) {
      return problem(PANEL_COMMANDS_COPY.problems.noNote(notes.length));
    }
    return noted(
      context,
      PANEL_COMMANDS_COPY.notes.editNote(Number(named), checked.text),
    );
  }
  if (rest !== "") {
    return problem(PANEL_COMMANDS_COPY.problems.noNote(notes.length));
  }
  await deleteNote(context.user, { questId: context.questId, id: note.id });
  return noted(context, PANEL_COMMANDS_COPY.notes.dropNote(note.text));
}

async function milestoneCommand(
  context: CommandContext,
): Promise<PanelCommandResult> {
  const milestones = await listMilestones(context.user, context.questId);
  const { place: named, rest, written } = placeThenRest(context.argument);
  const place = placeIn(named, milestones.length);
  const milestone = milestones[(place ?? 0) - 1];
  if (place === undefined || milestone === undefined) {
    return problem(PANEL_COMMANDS_COPY.problems.noMilestone(milestones.length));
  }
  if (context.name === "drop-milestone") {
    if (rest !== "") {
      return problem(
        PANEL_COMMANDS_COPY.problems.noMilestone(milestones.length),
      );
    }
    await deleteMilestone(context.user, milestone.id);
    return noted(
      context,
      PANEL_COMMANDS_COPY.notes.dropMilestone(milestone.text),
    );
  }
  // A milestone is one line, so one written on more is refused, not joined.
  const text = MILESTONE_TEXT.safeParse(written);
  if (!text.success) {
    if (rest === "") {
      return problem(PROGRESS_TIMELINE_COPY.needsText);
    }
    return problem(PROGRESS_TIMELINE_COPY.tooLong(MILESTONE_TEXT_MAX_LENGTH));
  }
  if (!(await editMilestone(context.user, milestone.id, text.data))) {
    return problem(PANEL_COMMANDS_COPY.problems.noMilestone(milestones.length));
  }
  return noted(
    context,
    PANEL_COMMANDS_COPY.notes.editMilestone(place, text.data),
  );
}

// What /start-day's words ask it to clear, or undefined for a word it
// doesn't take.
function clearing(
  argument: string,
): { readonly clearTasks: boolean; readonly clearIdeas: boolean } | undefined {
  const words = argument.split(WHITE_SPACE).filter((word) => word !== "");
  const known = [START_DAY_CLEAR_TASKS, START_DAY_CLEAR_IDEAS];
  if (!words.every((word) => known.includes(word.toLowerCase()))) {
    return undefined;
  }
  const lower = words.map((word) => word.toLowerCase());
  return {
    clearTasks: lower.includes(START_DAY_CLEAR_TASKS),
    clearIdeas: lower.includes(START_DAY_CLEAR_IDEAS),
  };
}

function conversationPath(questId: QuestId): string {
  return `/quests/${questId}?section=conversation`;
}

async function startDayCommand(
  context: CommandContext,
): Promise<PanelCommandResult> {
  const { user, chat, questId } = context;
  const quest = await getQuest(user, questId);
  if (quest === undefined || !quest.dailies || quest.status !== "active") {
    return problem(PANEL_COMMANDS_COPY.problems.notDailies);
  }
  if (context.name === "undo-start-day") {
    if (context.argument !== "") {
      return problem(PANEL_COMMANDS_COPY.problems.takesNothing(context.name));
    }
    const restored = await undoStartDay(user, chat.id);
    if (restored === undefined) {
      return problem(PANEL_COMMANDS_COPY.problems.cantUndoStartDay);
    }
    const note = PANEL_COMMANDS_COPY.notes.undoStartDay;
    await saveNote(user, restored, { command: context.text, note });
    refresh();
    return { kind: "noted", note, navigate: conversationPath(questId) };
  }
  const options = clearing(context.argument);
  if (options === undefined) {
    return problem(PANEL_COMMANDS_COPY.problems.startDayWords);
  }
  const cleared: string[] = [];
  if (options.clearTasks) {
    cleared.push(PANEL_COMMANDS_COPY.clearedTasks);
  }
  if (options.clearIdeas) {
    cleared.push(PANEL_COMMANDS_COPY.clearedIdeas);
  }
  const note = PANEL_COMMANDS_COPY.notes.startDay(cleared);
  // The new day's conversation starts empty, so the note goes in the one
  // before, which Start Day parks.
  const message = await saveNote(user, chat.id, {
    command: context.text,
    note,
  });
  const started = await startDay(user, chat.id, {
    localDate: dayDate(context.localDate, new Date()),
    ...options,
  });
  if (started === undefined) {
    return problem(PANEL_COMMANDS_COPY.problems.notDailies);
  }
  refresh();
  return { kind: "noted", note, message, navigate: conversationPath(questId) };
}

async function inviteCommand(
  context: CommandContext,
): Promise<PanelCommandResult> {
  const email = EMAIL_FIELD.safeParse(context.argument);
  if (context.argument === "" || !email.success) {
    return problem(PANEL_COMMANDS_COPY.problems.noEmail);
  }
  const quest = await getQuest(context.user, context.questId);
  if (quest?.dailies === true) {
    return problem(PANEL_COMMANDS_COPY.problems.dailies);
  }
  const result = await inviteToQuest(
    context.user,
    {
      questId: context.questId,
      email: email.data,
      origin: linkOrigin(await headers()),
    },
    new Date(),
  );
  switch (result.kind) {
    case "invited":
      return noted(context, PANEL_COMMANDS_COPY.notes.invited(email.data));
    case "unsent":
      return noted(context, PANEL_COMMANDS_COPY.notes.unsent(email.data));
    case "in-quest":
      return problem(QUEST_MEMBERS_COPY.inQuest(email.data));
    case "limited":
      return problem(QUEST_MEMBERS_COPY.limited);
    case "not-found":
      return problem(QUEST_MEMBERS_COPY.notFound);
    default:
      return result satisfies never;
  }
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

async function memberCommand(
  context: CommandContext,
): Promise<PanelCommandResult> {
  const { user, questId, name, argument } = context;
  const people = await listQuestPeople(user, questId);
  if (people === undefined) {
    return problem(QUEST_MEMBERS_COPY.notFound);
  }
  if (name === "leave") {
    if (argument !== "") {
      return problem(PANEL_COMMANDS_COPY.problems.takesNothing(name));
    }
    if (people.owner.id === user) {
      return problem(PANEL_COMMANDS_COPY.problems.owner);
    }
    const quest = await getQuest(user, questId);
    const note = PANEL_COMMANDS_COPY.notes.left;
    // Once they leave, the conversation is no longer theirs to write in.
    const message = await saveNote(user, context.chat.id, {
      command: context.text,
      note,
    });
    if (!(await removeFromQuest(user, { questId, person: user }))) {
      return problem(QUEST_MEMBERS_COPY.failed);
    }
    return {
      kind: "noted",
      note,
      message,
      navigate: HOME_PATH,
      leftQuest: quest?.name,
    };
  }
  if (name === "withdraw") {
    const invited = people.invited.find((person) =>
      sameName(person.displayName, argument),
    );
    if (invited === undefined) {
      return problem(PANEL_COMMANDS_COPY.problems.noInvitation(argument));
    }
    if (!(await removeFromQuest(user, { questId, person: invited.id }))) {
      return problem(QUEST_MEMBERS_COPY.failed);
    }
    return noted(
      context,
      PANEL_COMMANDS_COPY.notes.withdrawn(invited.displayName),
    );
  }
  if (sameName(people.owner.displayName, argument)) {
    return problem(PANEL_COMMANDS_COPY.problems.owner);
  }
  const members = people.members.filter((person) =>
    sameName(person.displayName, argument),
  );
  const [member] = members;
  if (member === undefined) {
    return problem(PANEL_COMMANDS_COPY.problems.noMember(argument));
  }
  if (members.length > 1) {
    return problem(PANEL_COMMANDS_COPY.problems.sameName(argument));
  }
  if (member.id === user) {
    return problem(PANEL_COMMANDS_COPY.problems.removeSelf);
  }
  if (!(await removeFromQuest(user, { questId, person: member.id }))) {
    return problem(QUEST_MEMBERS_COPY.failed);
  }
  return noted(context, PANEL_COMMANDS_COPY.notes.removed(member.displayName));
}

function runNamed(context: CommandContext): Promise<PanelCommandResult> {
  switch (context.name) {
    case "idea":
    case "edit-idea":
    case "move-idea":
    case "drop-idea":
    case "idea-to-tasks":
      return ideaCommand(context);
    case "edit-note":
    case "drop-note":
      return noteCommand(context);
    case "edit-milestone":
    case "drop-milestone":
      return milestoneCommand(context);
    case "start-day":
    case "undo-start-day":
      return startDayCommand(context);
    case "invite":
      return inviteCommand(context);
    case "withdraw":
    case "remove":
    case "leave":
      return memberCommand(context);
    case "start":
      // The conversation is open, so it has started: the start button
      // sends /start only to a quest without one (startQuestConversation).
      return Promise.resolve(problem(PANEL_COMMANDS_COPY.problems.started));
    default:
      return context.name satisfies never;
  }
}

// Runs text when it is a panel command, in the user's conversation chat;
// undefined when it is none, for the tasks commands to try.
async function runPanelCommand(
  user: UserId,
  chat: Chat,
  text: string,
  localDate: string | undefined,
): Promise<PanelCommandResult | undefined> {
  const line = readCommandLine(text);
  const name = panelCommandName(line?.name ?? "");
  if (line === undefined || name === undefined) {
    return undefined;
  }
  if (name !== "start" && (await chatAwaitsReply(user, chat.id))) {
    return problem(PANEL_COMMANDS_COPY.problems.awaitingReply);
  }
  return runNamed({
    user,
    chat,
    questId: chat.quest.id,
    name,
    text: text.trim(),
    argument: line.argument,
    localDate,
  });
}

export type { PanelCommandResult };
export { runPanelCommand };
