import { expect, test } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { getDb } from "@/db/client.ts";
import { goldBalances } from "@/db/tables/gold.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import {
  constructReply,
  messageText,
  signedInChat,
} from "../../../test-database/chat-test-kit.ts";

test("use_case_ask_any_subject", async () => {
  const { user, chat } = await signedInChat();
  await getDb()
    .insert(goldBalances)
    .values({ userId: user.id, microUsd: 0 })
    .onConflictDoUpdate({ target: goldBalances.userId, set: { microUsd: 0 } });
  const reply = await constructReply(chat.id, "I want a balcony garden");
  expect(messageText(reply)).toContain("Your message is saved");
  expect(messageText(reply)).toContain("Available commands");
  const started = await startDailies(user.id, {
    name: QUEST_NAME.parse("A fresh day"),
    context: "Make room for creativity",
    construct: getConstruct("vellum"),
  });
  expect(started.kind).toBe("started");
});

test("use_case_same_facts_any_construct", async () => {
  const { user, chat } = await signedInChat();
  const data = testData(user);
  const quest = await data.quest("Another construct");
  const other = await data.chat(quest, "lumen");
  const replies = await Promise.all([
    constructReply(chat.id, "help"),
    constructReply(other.id, "help"),
  ]);
  expect(messageText(replies[0])).toContain("Available commands");
  expect(messageText(replies[1])).toBe(messageText(replies[0]));
});
