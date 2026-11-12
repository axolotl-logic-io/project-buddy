// use_case_private_data for a user's private Chat, which is in no quest, on
// real rows of two users, read through the stores directly: it is hers
// alone, never a quest's conversation, and deleted with her account.
// conversations.server.test.ts checks that it is the same Chat each time.

import { describe, expect, test } from "vitest";
import { getChat } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  deleteAccount,
  reopenAccount,
  twoUsers,
} from "../test-database/two-users-test-kit.ts";

describe("use_case_private_data", () => {
  test("two users fetching their private Chats at once each get their own", async () => {
    const { her, other } = await twoUsers();
    const [hers, theirs] = await Promise.all([
      privateChat(her.id),
      privateChat(other.id),
    ]);

    expect(hers.id).not.toBe(theirs.id);
    expect((await getChat(her.id, hers.id))?.id).toBe(hers.id);
    expect(await getChat(her.id, theirs.id)).toBeUndefined();
    expect(await getChat(other.id, hers.id)).toBeUndefined();
  });

  test("her private Chat is not her quest's conversation", async () => {
    const her = await testUser();
    const herData = testData(her);
    const quest = await herData.quest();
    const projectChat = await herData.chat(quest);
    const chat = await privateChat(her.id);

    expect(chat.id).not.toBe(projectChat.id);
    expect((await readQuestConversation(her.id, quest.id))?.id).toBe(
      projectChat.id,
    );
  });

  // A new account at the same address then starts with a new, empty Chat.
  test("deleting an account deletes its private Chat", async () => {
    const her = await testUser();
    const hers = await privateChat(her.id);

    await deleteAccount(her);

    expect(await getChat(her.id, hers.id)).toBeUndefined();
    const again = await reopenAccount(her);
    expect((await privateChat(again.id)).id).not.toBe(hers.id);
  });
});
