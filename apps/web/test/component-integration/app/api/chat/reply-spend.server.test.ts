import { expect, test } from "vitest";
import { getDb } from "@/db/client.ts";
import { goldBalances } from "@/db/tables/gold.ts";
import {
  constructReply,
  messageText,
  userWithChat,
} from "../../../test-database/chat-test-kit.ts";

test("a quest reply works with an empty retained balance", async () => {
  const { user, chat } = await userWithChat();
  await getDb()
    .insert(goldBalances)
    .values({ userId: user.id, microUsd: 0 })
    .onConflictDoUpdate({ target: goldBalances.userId, set: { microUsd: 0 } });
  const reply = await constructReply(chat.id, "help");
  expect(messageText(reply)).toContain("Available commands");
});
