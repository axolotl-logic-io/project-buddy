import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { getVisualAsset } from "@/constructs/visual-asset-store.ts";
import { startDailies } from "@/conversations/dailies.ts";
import {
  readDailiesRecord,
  startDay,
  undoStartDay,
} from "@/dailies/day-store.ts";
import { getDb } from "@/db/client.ts";
import {
  constructAssetGrants,
  constructAssets,
} from "@/db/tables/construct-visuals.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { changeIdea, listIdeas } from "@/ideas/idea-store.ts";
import type { ChatId, UserId } from "@/ids.ts";
import {
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { getQuest } from "@/quests/store.ts";
import { currentSpell, setSpell } from "@/spells/spell-store.ts";
import { changeTasks, readTasks } from "@/tasks/tasks-store.ts";
import { messageIdFixture } from "../../support/id-fixtures.ts";
import { PNG_BASE64 } from "../../support/images/image-fixtures.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const KEEP = { localDate: "2026-11-14", clearTasks: false, clearIdeas: false };

// Starts a day with nothing removed, on date.
function startOn(
  owner: UserId,
  id: ChatId,
  localDate: string,
): Promise<ChatId | undefined> {
  return startDay(owner, id, { ...KEEP, localDate });
}

function resetConversation(
  owner: UserId,
  id: ChatId,
  options: { clearTasks: boolean; clearIdeas: boolean } = KEEP,
): Promise<ChatId | undefined> {
  return startDay(owner, id, { ...options, localDate: KEEP.localDate });
}

async function writeMessage(
  user: Awaited<ReturnType<typeof testUser>>,
  chat: Chat,
): Promise<void> {
  await saveMessage(user.id, chat.id, {
    id: messageIdFixture(),
    role: "user",
    parts: [{ type: "text", text: "An earlier day" }],
  });
}

// The user's Dailies conversation, the one kind that can be reset.
async function dailiesChat(
  user: Awaited<ReturnType<typeof testUser>>,
): Promise<Chat> {
  const started = await startDailies(user.id, {
    name: QUEST_NAME.parse("My day"),
    context: "Make room for creativity",
    construct: getConstruct("vellum"),
  });
  if (started.kind !== "started") {
    throw new Error("Dailies did not start");
  }
  return started.chat;
}

describe("Start Day", () => {
  test("use_case_start_day", async () => {
    const user = await testUser();
    const started = await startDailies(user.id, {
      name: QUEST_NAME.parse("My day"),
      context: "Make room for creativity",
      construct: getConstruct("vellum"),
    });
    if (started.kind !== "started") {
      throw new Error("Dailies did not start");
    }
    const before = started.chat;
    const questId = before.quest.id;
    await changeTasks(user.id, { questId, author: "person" }, [
      { op: "add", text: "Make tea" },
      { op: "add", text: "Draw a fox" },
      { op: "add", text: "Book the vet" },
      { op: "recur", task: 1, recurring: true },
      { op: "recur", task: 2, recurring: true },
      { op: "complete", task: 1 },
      { op: "complete", task: 3 },
    ]);
    await changeIdea(user.id, { op: "add", questId, text: "Try clay" });
    await setSpell(user.id, { chatId: before.id, spell: "brainstorm" });
    await writeMessage(user, before);
    const ideas = await listIdeas(user.id, questId);
    const milestone = await recordMilestone(
      user.id,
      { questId, chatId: before.id },
      "Made a clay fox",
    );
    const nextId = await resetConversation(user.id, before.id);
    expect(nextId).toBeDefined();
    const next = await getChat(user.id, nextId ?? "");
    expect(next?.quest.id).toBe(questId);
    expect(await getQuest(user.id, questId)).toBeDefined();
    expect((await readTasks(user.id, questId))?.items).toEqual([
      { number: 1, text: "Make tea", done: false, recurring: true },
      { number: 2, text: "Draw a fox", done: false, recurring: true },
      { number: 3, text: "Book the vet", done: true },
    ]);
    expect(await listIdeas(user.id, questId)).toEqual(ideas);
    expect(await listMilestones(user.id, questId)).toMatchObject([
      { id: milestone?.id, text: "Made a clay fox" },
    ]);
    if (next === undefined) {
      throw new Error("No fresh conversation");
    }
    expect(await listMessages(user.id, next.id)).toEqual([]);
    expect(await currentSpell(user.id, next)).toBeUndefined();
    expect(await getChat(user.id, before.id)).toBeUndefined();
    const record = await readDailiesRecord(user.id, questId);
    expect(record.undoable).toBe(true);
    expect(record.days).toMatchObject([
      { date: "2026-11-14", tasks: undefined },
    ]);
  });

  test("the next Start Day records the day before's recurring tasks", async () => {
    const user = await testUser();
    const first = await dailiesChat(user);
    const questId = first.quest.id;
    await changeTasks(user.id, { questId, author: "person" }, [
      { op: "add", text: "Make tea" },
      { op: "add", text: "Draw a fox" },
      { op: "add", text: "Book the vet" },
      { op: "recur", task: 1, recurring: true },
      { op: "recur", task: 2, recurring: true },
    ]);
    const second = await startOn(user.id, first.id, "2026-11-13");
    if (second === undefined) {
      throw new Error("The day did not start");
    }
    await changeTasks(user.id, { questId, author: "person" }, [
      { op: "complete", task: 1 },
      { op: "complete", task: 3 },
    ]);
    const third = await startOn(user.id, second, "2026-11-14");
    expect(third).toBeDefined();
    const record = await readDailiesRecord(user.id, questId);
    expect(record.days).toMatchObject([
      {
        date: "2026-11-13",
        tasks: [
          { number: 1, text: "Make tea", done: true },
          { number: 2, text: "Draw a fox", done: false },
        ],
      },
      { date: "2026-11-14", tasks: undefined },
    ]);
    // The conversation parked by the first Start Day is gone for good.
    const [parked] = await getDb()
      .select({ id: chats.id })
      .from(chats)
      .where(eq(chats.id, first.id));
    expect(parked).toBeUndefined();
    const stranger = await testUser();
    expect((await readDailiesRecord(stranger.id, questId)).days).toEqual([]);
  });

  test("use_case_undo_start_day", async () => {
    const user = await testUser();
    const before = await dailiesChat(user);
    const questId = before.quest.id;
    await changeTasks(user.id, { questId, author: "person" }, [
      { op: "add", text: "Make tea" },
      { op: "add", text: "Book the vet" },
      { op: "recur", task: 1, recurring: true },
      { op: "complete", task: 1 },
    ]);
    await changeIdea(user.id, { op: "add", questId, text: "Try clay" });
    const ideas = await listIdeas(user.id, questId);
    await setSpell(user.id, { chatId: before.id, spell: "brainstorm" });
    await writeMessage(user, before);
    const messages = await listMessages(user.id, before.id);
    const nextId = await startDay(user.id, before.id, {
      localDate: "2026-11-14",
      clearTasks: false,
      clearIdeas: true,
    });
    if (nextId === undefined) {
      throw new Error("The day did not start");
    }
    // A change after Start Day survives its undo.
    await changeTasks(user.id, { questId, author: "person" }, [
      { op: "add", text: "Water the plants" },
    ]);
    const stranger = await testUser();
    expect(await undoStartDay(stranger.id, nextId)).toBeUndefined();
    expect(await undoStartDay(user.id, nextId)).toBe(before.id);
    const back = await getChat(user.id, before.id);
    expect(back?.quest.id).toBe(questId);
    expect(await listMessages(user.id, before.id)).toEqual(messages);
    if (back === undefined) {
      throw new Error("The conversation did not come back");
    }
    expect(await currentSpell(user.id, back)).toBe("brainstorm");
    expect(await getChat(user.id, nextId)).toBeUndefined();
    expect((await readTasks(user.id, questId))?.items).toEqual([
      { number: 1, text: "Make tea", done: true, recurring: true },
      { number: 2, text: "Book the vet", done: false },
      { number: 3, text: "Water the plants", done: false },
    ]);
    expect(await listIdeas(user.id, questId)).toEqual(ideas);
    expect(await readDailiesRecord(user.id, questId)).toEqual({
      days: [],
      undoable: false,
    });
  });

  test("Start Day can't be undone once someone sends a message", async () => {
    const user = await testUser();
    const before = await dailiesChat(user);
    const nextId = await startOn(user.id, before.id, "2026-11-14");
    const next = await getChat(user.id, nextId ?? "");
    if (nextId === undefined || next === undefined) {
      throw new Error("The day did not start");
    }
    await writeMessage(user, next);
    const record = await readDailiesRecord(user.id, next.quest.id);
    expect(record.undoable).toBe(false);
    expect(await undoStartDay(user.id, nextId)).toBeUndefined();
    expect(await listMessages(user.id, nextId)).toHaveLength(1);
    expect(await getChat(user.id, before.id)).toBeUndefined();
  });

  test("Start Day can remove Tasks and Ideas when requested", async () => {
    const user = await testUser();
    const started = await startDailies(user.id, {
      name: QUEST_NAME.parse("My day"),
      context: "Make room for creativity",
      construct: getConstruct("vellum"),
    });
    if (started.kind !== "started") {
      throw new Error("Dailies did not start");
    }
    const questId = started.chat.quest.id;
    await changeTasks(user.id, { questId, author: "person" }, [
      { op: "add", text: "Make tea" },
    ]);
    await changeIdea(user.id, { op: "add", questId, text: "Try clay" });
    expect(
      await resetConversation(user.id, started.chat.id, {
        clearTasks: true,
        clearIdeas: true,
      }),
    ).toBeDefined();
    expect((await readTasks(user.id, questId))?.items).toEqual([]);
    expect(await listIdeas(user.id, questId)).toEqual([]);
  });

  test("another user cannot start a day in a Dailies conversation", async () => {
    const owner = await testUser();
    const other = await testUser();
    const chat = await dailiesChat(owner);
    await writeMessage(owner, chat);
    const before = await listMessages(owner.id, chat.id);
    expect(await resetConversation(other.id, chat.id)).toBeUndefined();
    expect(await listMessages(owner.id, chat.id)).toEqual(before);
    expect((await getChat(owner.id, chat.id))?.id).toBe(chat.id);
  });
  test("ordinary quest conversations have no Start Day", async () => {
    const user = await testUser();
    const data = testData(user);
    const chat = await data.chat(await data.quest());
    await writeMessage(user, chat);
    expect(await resetConversation(user.id, chat.id)).toBeUndefined();
    expect(await listMessages(user.id, chat.id)).toHaveLength(1);
  });
  test("Start Day and its undo keep artwork retained only by the conversation", async () => {
    const user = await testUser();
    const chat = await dailiesChat(user);
    const assetId = crypto.randomUUID();
    await getDb()
      .insert(constructAssets)
      .values({ id: assetId, mediaType: "image/png", data: PNG_BASE64 });
    await getDb()
      .insert(constructAssetGrants)
      .values({ assetId, adventureId: chat.id });
    await getDb()
      .update(chats)
      .set({
        constructParts: {
          ...chat.construct.definition,
          visual: {
            version: 1,
            description: "A brass owl",
            canonical: { kind: "generated", assetId },
          },
        },
      })
      .where(and(eq(chats.id, chat.id), chatOpenTo(user.id)));
    const nextId = await resetConversation(user.id, chat.id);
    if (nextId === undefined) {
      throw new Error("No reset conversation");
    }
    expect(
      await getVisualAsset(user.id, { kind: "adventure", id: nextId }, assetId),
    ).toEqual({ mediaType: "image/png", data: PNG_BASE64 });
    expect(
      await getVisualAsset(
        user.id,
        { kind: "adventure", id: chat.id },
        assetId,
      ),
    ).toBeUndefined();
    const stranger = await testUser();
    expect(
      await getVisualAsset(
        stranger.id,
        { kind: "adventure", id: nextId },
        assetId,
      ),
    ).toBeUndefined();
    expect(await undoStartDay(user.id, nextId)).toBe(chat.id);
    expect(
      await getVisualAsset(
        user.id,
        { kind: "adventure", id: chat.id },
        assetId,
      ),
    ).toEqual({ mediaType: "image/png", data: PNG_BASE64 });
  });
});
