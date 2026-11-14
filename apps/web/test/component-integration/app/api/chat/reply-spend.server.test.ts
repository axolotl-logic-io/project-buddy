import { expect, test } from "vitest";
import { getDb } from "@/db/client.ts";
import { goldBalances } from "@/db/tables/gold.ts";
import { constructReply, userWithChat } from "../../../test-database/chat-test-kit.ts";
import { eq } from "drizzle-orm";

test("a quest reply works with an empty retained balance", async () => {
  const { user, chat } = await userWithChat();
  await getDb().update(goldBalances).set({ balance: 0 }).where(eq(goldBalances.userId, user.id));
  const reply = await constructReply(chat.id, "help");
  expect(reply).toBeDefined();
});
