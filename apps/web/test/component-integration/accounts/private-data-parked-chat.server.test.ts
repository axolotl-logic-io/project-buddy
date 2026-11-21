// use_case_private_data for a chat that Start Day parked outside its quest
// for Undo: it is not found for anyone, its owner included, through the
// stores or the chat route.

import { describe, expect, test } from "vitest";
import { getChat, listMessages } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { CHAT_ID, type ChatId, type UserId } from "@/ids.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

// A chat of owner's, parked as Start Day parks one.
async function parkedChat(owner: UserId): Promise<ChatId> {
  const [row] = await getDb()
    .insert(chats)
    .values({ userId: owner, continuing: false, constructId: "vellum" })
    .returning({ id: chats.id });
  return CHAT_ID.parse(row?.id);
}

describe("use_case_private_data", () => {
  test("a parked chat is not found, even for its owner", async () => {
    const her = await testUser();
    const id = await parkedChat(her.id);
    await signIn(her);

    expect(await getChat(her.id, id)).toBeUndefined();
    expect(await listMessages(her.id, id)).toEqual([]);
    const sent = await sendChatMessage(id, "Hello");
    expect(sent.status).toBe(HTTP_STATUS.notFound);
  });
});
