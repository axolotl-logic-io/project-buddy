// use_case_private_data for a user's standalone chat, which is in no project,
// on real rows of two users, read and written through the stores directly:
// each new chat is hers, never among a project's chats, and deleted with
// her account. private-data-chats.server.test.ts checks that it is not found to
// another user.
import { describe, expect, test } from "vitest";
import {
  createStandaloneChat,
  listStandaloneChats,
} from "@/chats/standalone-chat.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import { testData } from "../test-database/data-test-kit.ts";
import {
  deleteAccount,
  reopenAccount,
  twoUsers,
} from "../test-database/two-users-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

describe("use_case_private_data", () => {
  test("standalone chats are distinct, including concurrent starts", async () => {
    const her = await testUser();
    const [first, atOnce] = await Promise.all([
      createStandaloneChat(her.id),
      createStandaloneChat(her.id),
    ]);
    const again = await createStandaloneChat(her.id);
    const last = await createStandaloneChat(her.id);

    const ids = [first.id, atOnce.id, again.id, last.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(first.project).toBeUndefined();
    expect(await getChat(her.id, first.id)).toEqual(first);
    expect(await listMessages(her.id, first.id)).toEqual([]);
  });

  test("two users fetching their standalone chats at once each get their own", async () => {
    const { her, other } = await twoUsers();
    const [hers, theirs] = await Promise.all([
      createStandaloneChat(her.id),
      createStandaloneChat(other.id),
    ]);

    expect(await getChat(her.id, hers.id)).toEqual(hers);
    expect(await getChat(other.id, theirs.id)).toEqual(theirs);
    expect((await listStandaloneChats(her.id)).map(({ id }) => id)).toEqual([
      hers.id,
    ]);
    expect((await listStandaloneChats(other.id)).map(({ id }) => id)).toEqual([
      theirs.id,
    ]);
  });
});

describe("use_case_private_data standalone chats and projects", () => {
  test("a standalone chat is in no project's chats", async () => {
    const her = await testUser();
    const herData = testData(her);
    const project = await herData.project();
    const projectChat = await herData.chat(project);
    await createStandaloneChat(her.id);

    expect((await listChats(her.id, project.id)).map(({ id }) => id)).toEqual([
      projectChat.id,
    ]);
  });

  // A new account at the same address then starts with none.
  test("deleting an account deletes its standalone chat", async () => {
    const her = await testUser();
    const hers = await createStandaloneChat(her.id);

    await deleteAccount(her);

    expect(await getChat(her.id, hers.id)).toBeUndefined();
    const again = await reopenAccount(her);
    expect(await listStandaloneChats(again.id)).toEqual([]);
  });
});
