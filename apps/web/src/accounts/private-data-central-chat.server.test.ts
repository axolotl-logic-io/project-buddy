// use_case_private_data for a user's central chat, which is in no project,
// on real rows of two users, read and written through the stores directly:
// it is one chat of hers however often or however concurrently it is
// fetched, it is never among a project's chats, and it goes with her
// account. private-data-chats.server.test.ts checks that it is not found to
// another user.
import { describe, expect, test } from "vitest";
import { getOrCreateCentralChat } from "@/chats/central-chat.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import {
  deleteAccount,
  reopenAccount,
  twoUsers,
} from "@/test-database/two-users-test-kit.ts";

describe("use_case_private_data", () => {
  // Fetched two at once while she has none, so both race to make it, then
  // one call after another, and getChat finds it as central.
  test("her central chat is one chat, however it is fetched", async () => {
    const { her } = await twoUsers();
    const [first, atOnce] = await Promise.all([
      getOrCreateCentralChat(her.id),
      getOrCreateCentralChat(her.id),
    ]);
    const again = await getOrCreateCentralChat(her.id);
    const last = await getOrCreateCentralChat(her.id);

    expect([atOnce.id, again.id, last.id]).toEqual([
      first.id,
      first.id,
      first.id,
    ]);
    expect(first.kind).toBe("central");
    expect(await getChat(her.id, first.id)).toEqual(first);
    expect(await listMessages(her.id, first.id)).toEqual([]);
  });

  test("two users fetching their central chats at once each get their own", async () => {
    const { her, other } = await twoUsers();
    const [hers, theirs] = await Promise.all([
      getOrCreateCentralChat(her.id),
      getOrCreateCentralChat(other.id),
    ]);

    expect(hers.id).not.toBe(theirs.id);
  });

  test("a central chat is in no project's chats", async () => {
    const { her, herData } = await twoUsers();
    const project = await herData.project();
    const projectChat = await herData.chat(project);
    await getOrCreateCentralChat(her.id);

    expect((await listChats(her.id, project.id)).map(({ id }) => id)).toEqual([
      projectChat.id,
    ]);
  });

  // A new account at the same address then gets a new one.
  test("deleting an account deletes its central chat", async () => {
    const { her } = await twoUsers();
    const hers = await getOrCreateCentralChat(her.id);

    await deleteAccount(her);

    expect(await getChat(her.id, hers.id)).toBeUndefined();
    const again = await reopenAccount(her);
    expect((await getOrCreateCentralChat(again.id)).id).not.toBe(hers.id);
  });
});
