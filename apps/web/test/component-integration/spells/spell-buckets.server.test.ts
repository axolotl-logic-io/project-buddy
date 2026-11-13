import { afterEach, describe, expect, test, vi } from "vitest";
import { getChat, listMessages } from "@/chats/store.ts";
import { listIdeas } from "@/ideas/idea-store.ts";
import { MESSAGE_ID } from "@/ids.ts";
import { readPlan } from "@/plan/plan-store.ts";
import { spellReply } from "@/spells/spell-reply.ts";
import { currentSpell } from "@/spells/spell-store.ts";
import {
  constructReply,
  question,
  signedInChat,
} from "../test-database/chat-test-kit.ts";

afterEach(() => vi.unstubAllEnvs());

describe("use_case_spell_buckets", () => {
  test("commands cast the persistent spell and route subsequent messages until stopped", async () => {
    const { user, chat } = await signedInChat();
    await constructReply(chat.id, "cast Brainstorm");
    expect(await currentSpell(user.id, chat)).toBe("brainstorm");
    await constructReply(chat.id, "Make a clay fox");
    expect(
      (await listIdeas(user.id, chat.quest.id)).map((idea) => idea.text),
    ).toEqual(["Make a clay fox"]);
    expect((await readPlan(user.id, chat.quest.id))?.steps).toEqual([]);
    await constructReply(chat.id, "/cast plan");
    expect(await currentSpell(user.id, chat)).toBe("plan");
    await constructReply(chat.id, "Buy clay");
    expect((await readPlan(user.id, chat.quest.id))?.steps).toMatchObject([
      { text: "Buy clay", done: false },
    ]);
    await constructReply(chat.id, "/stop");
    expect(await currentSpell(user.id, chat)).toBeUndefined();
    await constructReply(chat.id, "This stays in the conversation");
    expect(await listIdeas(user.id, chat.quest.id)).toHaveLength(1);
    expect((await readPlan(user.id, chat.quest.id))?.steps).toHaveLength(1);
  });

  test("replaying a saved message adds no second item and foreign access writes nothing", async () => {
    const { user, chat } = await signedInChat();
    await constructReply(chat.id, "/brainstorm");
    await constructReply(chat.id, "Try origami");
    const message = (await listMessages(user.id, chat.id)).findLast(
      (entry) => entry.role === "user",
    );
    if (message === undefined) {
      throw new Error("Expected saved user message");
    }
    expect(
      await spellReply(
        user.id,
        chat,
        question("Try origami", MESSAGE_ID.parse(message.id)),
      ),
    ).toBe("Saved to Ideas.");
    expect(await listIdeas(user.id, chat.quest.id)).toHaveLength(1);
    const other = await signedInChat();
    expect(await getChat(other.user.id, chat.id)).toBeUndefined();
    expect(
      await spellReply(
        other.user.id,
        chat,
        question("Try origami", MESSAGE_ID.parse(message.id)),
      ),
    ).toBeUndefined();
    expect(await listIdeas(user.id, chat.quest.id)).toHaveLength(1);
  });
});

test("removed spells and cast stop never change the active spell", async () => {
  const { user, chat } = await signedInChat();
  await constructReply(chat.id, "/brainstorm");
  await constructReply(chat.id, "cast ask-one-question");
  expect(await currentSpell(user.id, chat)).toBe("brainstorm");
  await constructReply(chat.id, "cast stop");
  expect(await currentSpell(user.id, chat)).toBe("brainstorm");
  expect(await listIdeas(user.id, chat.quest.id)).toEqual([]);
});
