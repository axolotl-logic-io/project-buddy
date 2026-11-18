import { expect, test } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { getDb } from "@/db/client.ts";
import { goldBalances } from "@/db/tables/gold.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { setSpell } from "@/spells/spell-store.ts";
import { LOCAL_CONSTRUCT_COPY } from "@/ui/copy/local-construct.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import {
  constructReply,
  messageText,
  signedInChat,
} from "../../../test-database/chat-test-kit.ts";

test("a spell and a Dailies quest work without a credit balance", async () => {
  const { user, chat } = await signedInChat();
  await getDb()
    .insert(goldBalances)
    .values({ userId: user.id, microUsd: 0 })
    .onConflictDoUpdate({ target: goldBalances.userId, set: { microUsd: 0 } });
  const reply = await constructReply(chat.id, "/unknown");
  expect(messageText(reply)).toBe(LOCAL_CONSTRUCT_COPY.unknownCommand);
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
  await setSpell(user.id, { chatId: other.id, spell: "tasks" });
  const replies = await Promise.all([
    constructReply(chat.id, "help"),
    constructReply(other.id, "help"),
  ]);
  expect(messageText(replies[0])).toBe(LOCAL_CONSTRUCT_COPY.help);
  expect(messageText(replies[1])).toBe(messageText(replies[0]));
});
