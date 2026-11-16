// The commands a quest panel control sends to the conversation, run in the
// test database: Start Day and its undo, the tasks' /recur and /once, and
// /start, which the start button sends to a quest without a conversation.
// Ideas, Quick Notes, milestones, members and status have theirs tested
// beside the rest of their cases.

import { describe, expect, test, vi } from "vitest";
import type { Chat } from "@/chats/chat-rows.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { PANEL_COMMAND } from "@/commands/panel-commands.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startDailies } from "@/conversations/dailies.ts";
import {
  readQuestConversation,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import { readDailiesRecord } from "@/dailies/day-store.ts";
import { changeIdea, listIdeas } from "@/ideas/idea-store.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { readTasks } from "@/tasks/tasks-store.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { commandNotes, runCommand } from "./command-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const notes: typeof PANEL_COMMANDS_COPY.notes = PANEL_COMMANDS_COPY.notes;
const problems: typeof PANEL_COMMANDS_COPY.problems =
  PANEL_COMMANDS_COPY.problems;
const LOCAL_DATE = "2026-11-14";

// A signed-in user's Dailies conversation.
async function signedInDailies(): Promise<{
  readonly user: Awaited<ReturnType<typeof testUser>>;
  readonly chat: Chat;
}> {
  const user = await testUser();
  const started = await startDailies(user.id, {
    name: QUEST_NAME.parse("My day"),
    context: "Make room for creativity",
    construct: getConstruct("vellum"),
  });
  if (started.kind !== "started") {
    throw new Error("Dailies did not start");
  }
  await signIn(user);
  return { user, chat: started.chat };
}

// The quest's conversation as it is now.
async function conversationNow(user: UserId, questId: QuestId): Promise<Chat> {
  const conversation = await readQuestConversation(user, questId);
  const chat = await getChat(user, conversation?.id ?? "");
  if (chat === undefined) {
    throw new Error("The quest has no conversation");
  }
  return chat;
}

describe("use_case_start_day", () => {
  test("/start-day starts a day on the browser's date, clears what it names, and notes it in the day before", async () => {
    const { user, chat } = await signedInDailies();
    const questId = chat.quest.id;
    await runCommand(chat.id, "/add Make tea");
    await changeIdea(user.id, { op: "add", questId, text: "Try clay" });
    const command = PANEL_COMMAND.startDay({
      clearTasks: false,
      clearIdeas: true,
    });

    expect(await runCommand(chat.id, command, LOCAL_DATE)).toMatchObject({
      kind: "noted",
      note: notes.startDay([PANEL_COMMANDS_COPY.clearedIdeas]),
      navigate: `/quests/${questId}?section=conversation`,
    });

    expect(await getChat(user.id, chat.id)).toBeUndefined();
    const next = await conversationNow(user.id, questId);
    expect(next.id).not.toBe(chat.id);
    expect(await listMessages(user.id, next.id)).toEqual([]);
    expect(await listIdeas(user.id, questId)).toEqual([]);
    expect((await readTasks(user.id, questId))?.items).toMatchObject([
      { text: "Make tea" },
    ]);
    expect((await readDailiesRecord(user.id, questId)).days).toMatchObject([
      { date: LOCAL_DATE },
    ]);
  });

  test("/start-day says why it can't start a day, and starts none", async () => {
    const { user, chat } = await signedInDailies();
    const quest = await testData(user).quest();
    const ordinary = await testData(user).chat(quest);

    expect(await runCommand(chat.id, "/start-day tomorrow")).toEqual({
      kind: "problem",
      text: problems.startDayWords,
    });
    expect(
      await runCommand(
        ordinary.id,
        PANEL_COMMAND.startDay({ clearTasks: false, clearIdeas: false }),
      ),
    ).toEqual({ kind: "problem", text: problems.notDailies });

    expect((await conversationNow(user.id, chat.quest.id)).id).toBe(chat.id);
    expect((await readDailiesRecord(user.id, chat.quest.id)).days).toEqual([]);
    expect(await commandNotes(user.id, chat.id)).toEqual([]);
  });
});

describe("use_case_undo_start_day", () => {
  test("/undo-start-day brings back the day before, with both commands noted in it", async () => {
    const { user, chat } = await signedInDailies();
    const questId = chat.quest.id;
    const start = PANEL_COMMAND.startDay({
      clearTasks: false,
      clearIdeas: false,
    });
    await runCommand(chat.id, start, LOCAL_DATE);
    const next = await conversationNow(user.id, questId);

    expect(
      await runCommand(next.id, `${PANEL_COMMAND.undoStartDay} now`),
    ).toEqual({
      kind: "problem",
      text: problems.takesNothing("undo-start-day"),
    });
    expect(await runCommand(next.id, PANEL_COMMAND.undoStartDay)).toMatchObject(
      {
        kind: "noted",
        note: notes.undoStartDay,
        navigate: `/quests/${questId}?section=conversation`,
      },
    );

    const restored = await conversationNow(user.id, questId);
    expect(restored.id).toBe(chat.id);
    expect(await commandNotes(user.id, restored.id)).toEqual([
      { command: start, note: notes.startDay([]) },
      { command: PANEL_COMMAND.undoStartDay, note: notes.undoStartDay },
    ]);
    expect((await readDailiesRecord(user.id, questId)).days).toEqual([]);
    expect(await runCommand(restored.id, PANEL_COMMAND.undoStartDay)).toEqual({
      kind: "problem",
      text: problems.cantUndoStartDay,
    });
  });
});

describe("use_case_recurring_tasks", () => {
  test("/recur makes a Dailies task recurring and /once makes it one-off again", async () => {
    const { user, chat } = await signedInDailies();
    const questId = chat.quest.id;
    await runCommand(chat.id, "/add Make tea");

    expect(await runCommand(chat.id, "/recur 1")).toMatchObject({
      kind: "changed",
    });
    expect((await readTasks(user.id, questId))?.items).toEqual([
      { number: 1, text: "Make tea", done: false, recurring: true },
    ]);
    expect(await runCommand(chat.id, "/once 1")).toMatchObject({
      kind: "changed",
    });
    expect((await readTasks(user.id, questId))?.items).toEqual([
      { number: 1, text: "Make tea", done: false },
    ]);
    expect(await runCommand(chat.id, "/recur 2")).toMatchObject({
      kind: "problem",
    });
  });
});

describe("use_case_open_quest", () => {
  test("the start button's /start shows before the opening, and a conversation started otherwise has no /start", async () => {
    const user = await testUser();
    const data = testData(user);
    const [pressed, other] = await Promise.all([data.quest(), data.quest()]);

    const started = await startQuestConversation(user.id, pressed.id, true);
    const plain = await startQuestConversation(user.id, other.id);
    if (started.kind !== "started" || plain.kind !== "started") {
      throw new Error("A conversation did not start");
    }

    const messages = await listMessages(user.id, started.conversation.id);
    expect(messages.map(({ role }) => role)).toEqual(["user", "assistant"]);
    expect(await commandNotes(user.id, started.conversation.id)).toEqual([
      { command: PANEL_COMMAND.start, note: notes.started },
    ]);
    expect(await commandNotes(user.id, plain.conversation.id)).toEqual([]);
    expect(
      (await listMessages(user.id, plain.conversation.id)).map(
        ({ role }) => role,
      ),
    ).toEqual(["assistant"]);

    await signIn(user);
    expect(
      await runCommand(started.conversation.id, PANEL_COMMAND.start),
    ).toEqual({ kind: "problem", text: problems.started });
  });

  test("Dailies starts with its opening and no /start", async () => {
    const { user, chat } = await signedInDailies();
    expect(await commandNotes(user.id, chat.id)).toEqual([]);
  });
});
