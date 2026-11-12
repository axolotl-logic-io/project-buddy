import { afterEach, describe, expect, test, vi } from "vitest";
import { activityReply } from "@/activities/activity-reply.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import { MESSAGE_ID } from "@/ids.ts";
import { readPlan } from "@/plan/plan-store.ts";
import {
  constructReply,
  question,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

afterEach(() => vi.unstubAllEnvs());

describe("use_case_activity_buckets", () => {
  test("commands switch the saved Activity and route subsequent messages until stopped", async () => {
    const { user, chat } = await signedInChat();
    vi.stubEnv("CONSTRUCT_MODEL", "local");
    await constructReply(chat.id, "brainstorm");
    expect((await currentActivity(user.id, chat)).name).toBe("Brainstorm");
    await constructReply(chat.id, "Make a clay fox");
    expect(
      (await listIdeas(user.id, chat.quest.id)).map((idea) => idea.text),
    ).toEqual(["Make a clay fox"]);
    expect((await readPlan(user.id, chat.quest.id))?.steps).toEqual([]);
    await constructReply(chat.id, "/plan");
    expect((await currentActivity(user.id, chat)).name).toBe("Plan");
    await constructReply(chat.id, "Buy clay");
    expect((await readPlan(user.id, chat.quest.id))?.steps).toMatchObject([
      { text: "Buy clay", done: false },
    ]);
    await constructReply(chat.id, "/stop");
    expect((await currentActivity(user.id, chat)).id).toBe("open-chat");
    await constructReply(chat.id, "This stays in the conversation");
    expect(await listIdeas(user.id, chat.quest.id)).toHaveLength(1);
    expect((await readPlan(user.id, chat.quest.id))?.steps).toHaveLength(1);
  });

  test("replaying a saved message adds no second item and foreign access writes nothing", async () => {
    const { user, chat } = await signedInChat();
    vi.stubEnv("CONSTRUCT_MODEL", "local");
    await constructReply(chat.id, "/brainstorm");
    await constructReply(chat.id, "Try origami");
    const message = (await listMessages(user.id, chat.id)).findLast(
      (entry) => entry.role === "user",
    );
    if (message === undefined) {
      throw new Error("Expected saved user message");
    }
    expect(
      await activityReply(
        user.id,
        chat,
        question("Try origami", MESSAGE_ID.parse(message.id)),
      ),
    ).toBe("Saved to Ideas.");
    expect(await listIdeas(user.id, chat.quest.id)).toHaveLength(1);
    const other = await signedInChat();
    expect(await getChat(other.user.id, chat.id)).toBeUndefined();
    expect(
      await activityReply(
        other.user.id,
        chat,
        question("Try origami", MESSAGE_ID.parse(message.id)),
      ),
    ).toBeUndefined();
    expect(await listIdeas(user.id, chat.quest.id)).toHaveLength(1);
  });
});
