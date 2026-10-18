// use_case_private_data for a user's central chat, which is in no project,
// on real rows of two users, read and written through the stores directly:
// each new chat is hers, never among a project's chats, and deleted with
// her account. private-data-chats.server.test.ts checks that it is not found to
// another user.
import { describe, expect, test } from "vitest";
import { createCentralChat } from "@/chats/central-chat.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import {
  deleteAccount,
  reopenAccount,
  twoUsers,
} from "@/test-database/two-users-test-kit.ts";

describe("use_case_private_data", () => {
  test("standalone chats are distinct, including concurrent starts", async () => {
    const { her } = await twoUsers();
    const [first, atOnce] = await Promise.all([
      createCentralChat(her.id),
      createCentralChat(her.id),
    ]);
    const again = await createCentralChat(her.id);
    const last = await createCentralChat(her.id);

    const ids = [first.id, atOnce.id, again.id, last.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(first.kind).toBe("central");
    expect(await getChat(her.id, first.id)).toEqual(first);
    expect(await listMessages(her.id, first.id)).toEqual([]);
  });

  test("two users fetching their central chats at once each get their own", async () => {
    const { her, other } = await twoUsers();
    const [hers, theirs] = await Promise.all([
      createCentralChat(her.id),
      createCentralChat(other.id),
    ]);

    expect(hers.id).not.toBe(theirs.id);
  });

  test("a central chat is in no project's chats", async () => {
    const { her, herData } = await twoUsers();
    const project = await herData.project();
    const projectChat = await herData.chat(project);
    await createCentralChat(her.id);

    expect((await listChats(her.id, project.id)).map(({ id }) => id)).toEqual([
      projectChat.id,
    ]);
  });

  // A new account at the same address then gets a new one.
  test("deleting an account deletes its central chat", async () => {
    const { her } = await twoUsers();
    const hers = await createCentralChat(her.id);

    await deleteAccount(her);

    expect(await getChat(her.id, hers.id)).toBeUndefined();
    const again = await reopenAccount(her);
    expect((await createCentralChat(again.id)).id).not.toBe(hers.id);
  });
});
