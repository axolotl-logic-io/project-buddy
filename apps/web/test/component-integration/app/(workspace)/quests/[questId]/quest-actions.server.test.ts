import { expect, test, vi } from "vitest";
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { findConversation } from "@/conversations/conversation-store.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { changeDayAction } from "@/dailies/day-actions.ts";
import { readDailiesRecord } from "@/dailies/day-store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { changeIdeaAction } from "@/ideas/idea-actions.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import { addMilestoneAction } from "@/milestones/milestone-actions.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { changeNoteAction, saveNoteAction } from "@/notes/note-actions.ts";
import { listNotes } from "@/notes/note-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { getQuest } from "@/quests/store.ts";
import { changeQuestSpellAction } from "@/spells/quest-spell-action.ts";
import { changeTasksAction } from "@/tasks/tasks-actions.ts";
import { readTasks } from "@/tasks/tasks-store.ts";
import {
  constructReply,
  formOf,
  messageText,
  postMessage,
  question,
} from "../../../../test-database/chat-test-kit.ts";
import { signIn } from "../../../../test-database/session-test-kit.ts";
import { twoUsers } from "../../../../test-database/two-users-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("quest actions update collections and status with no conversation", async () => {
  const { her, herData, other } = await twoUsers();
  const quest = await herData.quest();
  const questId = quest.id;
  expect(
    await changeIdeaAction({ op: "add", questId, text: "Try clay" }),
  ).toMatchObject({ kind: "saved" });
  expect(
    await changeTasksAction({
      questId,
      operations: [{ op: "add", text: "Sketch first" }],
    }),
  ).toMatchObject({ kind: "changed" });
  expect(
    await saveNoteAction({ questId, text: "Use soft clay" }),
  ).toMatchObject({ kind: "saved" });
  const [note] = await listNotes(her.id, questId);
  expect(
    await changeNoteAction({ questId, id: note?.id, text: "Use red clay" }),
  ).toMatchObject({ kind: "saved" });
  expect(
    await changeQuestStatusAction(
      { kind: "idle" },
      formOf({
        questId,
        fromStatus: "active",
        toStatus: "completed",
        revision: String(quest.statusRevision),
      }),
    ),
  ).toMatchObject({ kind: "saved" });
  expect((await getQuest(her.id, questId))?.status).toBe("completed");
  expect(
    await addMilestoneAction({ questId, text: "Built the frame" }),
  ).toMatchObject({ kind: "saved" });
  expect(await listMilestones(her.id, questId)).toMatchObject([
    { text: "Built the frame", chatId: undefined },
  ]);
  expect(await findConversation(her.id, questId)).toBeUndefined();

  await signIn(other);
  expect(
    await changeIdeaAction({ op: "add", questId, text: "Uninvited" }),
  ).toMatchObject({ kind: "problem" });
  expect(
    await changeNoteAction({ questId, id: note?.id, text: "Uninvited" }),
  ).toMatchObject({ kind: "problem" });
  expect((await listIdeas(her.id, questId)).map((idea) => idea.text)).toEqual([
    "Try clay",
  ]);
  expect((await listNotes(her.id, questId)).map((item) => item.text)).toEqual([
    "Use red clay",
  ]);
});

test("use_case_spell_required", async () => {
  const { her, herData } = await twoUsers();
  const quest = await herData.quest();
  const chat = await herData.chat(quest);
  const refused = await postMessage(her, chat, question("/cast tasks"));
  expect(refused.status).toBe(HTTP_STATUS.forbidden);
  expect(await refused.text()).toBe("spell-required");
  expect(await listMessages(her.id, chat.id)).toEqual([]);
  expect((await readTasks(her.id, quest.id))?.items).toEqual([]);
});

test("casts without a transcript, captures in the selected collection and rejects direct sends after Stop", async () => {
  const { her, herData } = await twoUsers();
  const quest = await herData.quest();
  const questId = quest.id;
  expect(
    await changeQuestSpellAction({ questId, spell: "brainstorm" }),
  ).toEqual({ kind: "saved" });
  const chat = await findConversation(her.id, questId);
  if (chat === undefined) {
    throw new Error("The cast did not open a conversation");
  }
  expect(await listMessages(her.id, chat.id)).toEqual([]);
  expect(
    messageText(await constructReply(chat.id, "Cast a brass fox")),
  ).toContain("Ideas");
  expect((await listIdeas(her.id, questId)).map((idea) => idea.text)).toEqual([
    "Cast a brass fox",
  ]);

  expect(await changeQuestSpellAction({ questId, spell: "tasks" })).toEqual({
    kind: "saved",
  });
  const next = await getChat(her.id, chat.id);
  expect(next?.spellStartedAt).toBeDefined();
  expect(await listMessages(her.id, chat.id, next?.spellStartedAt)).toEqual([]);
  expect(messageText(await constructReply(chat.id, "Buy paper"))).toContain(
    "Tasks",
  );
  expect((await readTasks(her.id, questId))?.items).toMatchObject([
    { text: "Buy paper" },
  ]);

  expect(await changeQuestSpellAction({ questId })).toEqual({ kind: "saved" });
  const before = await listMessages(her.id, chat.id);
  const refused = await postMessage(
    her,
    chat,
    question("This must not be saved"),
  );
  expect(refused.status).toBe(HTTP_STATUS.forbidden);
  expect(await refused.text()).toBe("spell-required");
  expect(await listMessages(her.id, chat.id)).toEqual(before);
});

test("Dailies Start Day and Undo save records and restore collections without chat messages", async () => {
  const { her } = await twoUsers();
  const started = await startDailies(her.id, {
    name: QUEST_NAME.parse("Daily work"),
    construct: getConstruct("vellum"),
    context: "",
  });
  if (started.kind !== "started") {
    throw new Error("Dailies did not start");
  }
  const { chat } = started;
  const questId = chat.quest.id;
  await changeTasksAction({
    questId,
    operations: [{ op: "add", text: "Make tea" }],
  });
  await changeIdeaAction({ op: "add", questId, text: "Try mint" });
  const oldMessages = await listMessages(her.id, chat.id);

  expect(
    await changeDayAction({
      op: "start",
      questId,
      chatId: chat.id,
      localDate: "2026-11-18",
      clearTasks: true,
      clearIdeas: true,
    }),
  ).toMatchObject({ kind: "saved" });
  const current = await findConversation(her.id, questId);
  if (current === undefined) {
    throw new Error("Start Day did not open the day's workspace");
  }
  expect(await readDailiesRecord(her.id, questId)).toMatchObject({
    days: [{ date: "2026-11-18" }],
    undoable: true,
  });
  expect(await listIdeas(her.id, questId)).toEqual([]);
  expect((await readTasks(her.id, questId))?.items).toEqual([]);
  expect(await listMessages(her.id, current.id)).toEqual([]);

  expect(
    await changeDayAction({ op: "undo", questId, chatId: current.id }),
  ).toMatchObject({ kind: "saved" });
  expect(await readDailiesRecord(her.id, questId)).toEqual({
    days: [],
    undoable: false,
  });
  expect((await listIdeas(her.id, questId)).map((idea) => idea.text)).toEqual([
    "Try mint",
  ]);
  expect((await readTasks(her.id, questId))?.items).toMatchObject([
    { text: "Make tea" },
  ]);
  expect(await listMessages(her.id, chat.id)).toEqual(oldMessages);
});
