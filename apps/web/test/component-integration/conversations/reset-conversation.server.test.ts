import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { getVisualAsset } from "@/constructs/visual-asset-store.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { resetConversation } from "@/conversations/reset-conversation.ts";
import { getDb } from "@/db/client.ts";
import {
  constructAssetGrants,
  constructAssets,
} from "@/db/tables/construct-visuals.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { changeIdea, listIdeas } from "@/ideas/idea-store.ts";
import {
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import { changePlan, readPlan } from "@/plan/plan-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { getQuest } from "@/quests/store.ts";
import { currentSpell, setSpell } from "@/spells/spell-store.ts";
import { messageIdFixture } from "../../support/id-fixtures.ts";
import { PNG_BASE64 } from "../../support/images/image-fixtures.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

async function writeMessage(
  user: Awaited<ReturnType<typeof testUser>>,
  chat: Awaited<ReturnType<typeof privateChat>>,
): Promise<void> {
  await saveMessage(user.id, chat.id, {
    id: messageIdFixture(),
    role: "user",
    parts: [{ type: "text", text: "An earlier day" }],
  });
}

describe("conversation resets", () => {
  test("use_case_reset_chat", async () => {
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
    await changePlan(user.id, { questId, author: "person" }, [
      { op: "add", text: "Make tea" },
      { op: "add", text: "Draw a fox" },
      { op: "complete", step: 1 },
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
    expect(next?.quest?.id).toBe(questId);
    expect(await getQuest(user.id, questId)).toBeDefined();
    expect((await readPlan(user.id, questId))?.steps).toEqual([
      { number: 1, text: "Make tea", done: false },
      { number: 2, text: "Draw a fox", done: false },
    ]);
    expect(await listIdeas(user.id, questId)).toEqual(ideas);
    expect(await listMilestones(user.id, questId)).toMatchObject([
      { id: milestone?.id, text: "Made a clay fox", chatId: undefined },
    ]);
    if (next === undefined) {
      throw new Error("No fresh conversation");
    }
    expect(await listMessages(user.id, next.id)).toEqual([]);
    expect(await currentSpell(user.id, next)).toBeUndefined();
    expect(await getChat(user.id, before.id)).toBeUndefined();
  });

  test("reset can remove Steps and Ideas when requested", async () => {
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
    await changePlan(user.id, { questId, author: "person" }, [
      { op: "add", text: "Make tea" },
    ]);
    await changeIdea(user.id, { op: "add", questId, text: "Try clay" });
    expect(
      await resetConversation(user.id, started.chat.id, {
        clearSteps: true,
        clearIdeas: true,
      }),
    ).toBeDefined();
    expect((await readPlan(user.id, questId))?.steps).toEqual([]);
    expect(await listIdeas(user.id, questId)).toEqual([]);
  });

  test("another user cannot reset a private conversation", async () => {
    const owner = await testUser();
    const other = await testUser();
    const chat = await privateChat(owner.id);
    await writeMessage(owner, chat);
    expect(await resetConversation(other.id, chat.id)).toBeUndefined();
    expect(await listMessages(owner.id, chat.id)).toHaveLength(1);
    expect((await privateChat(owner.id)).id).toBe(chat.id);
  });
  test("ordinary quest conversations cannot be reset", async () => {
    const user = await testUser();
    const data = testData(user);
    const chat = await data.chat(await data.quest());
    await writeMessage(user, chat);
    expect(await resetConversation(user.id, chat.id)).toBeUndefined();
    expect(await listMessages(user.id, chat.id)).toHaveLength(1);
  });
  test("reset preserves artwork retained only by the conversation", async () => {
    const user = await testUser();
    const chat = await privateChat(user.id);
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
    const other = await testUser();
    expect(
      await getVisualAsset(
        other.id,
        { kind: "adventure", id: nextId },
        assetId,
      ),
    ).toBeUndefined();
  });
});
