// A user's central chat, which is in no project, on real rows of two users,
// read and written through the stores directly: it is one chat however
// often or however concurrently it is fetched, it is not found to another
// user, it is never among a project's chats, and it goes with its account.
// accounts-isolation-stores.spec.ts covers the rest of the case on stores.
import { expect } from "@playwright/test";
import { findOrCreateUser, type User } from "@/accounts/users-store.ts";
import { getOrCreateCentralChat } from "@/chats/central-chat.ts";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { NewMessage } from "@/chats/chat-rows.ts";
import {
  getChat,
  listChats,
  listMessages,
  renameChat,
  saveMessage,
} from "@/chats/store.ts";
import type { Database } from "@/db/client.ts";
import { messageIdFixture } from "@/id-fixtures.ts";
import { deleteAccount, type TestData, test } from "./fixtures.ts";

// A message the other user tries to save into her central chat.
function theirMessage(): NewMessage {
  return {
    id: messageIdFixture(),
    role: "user",
    parts: [{ type: "text", text: "Mine now" }],
  };
}

// Her central chat is one chat, fetched one call after another or two at
// once, and getChat finds it as central.
async function fetchHerCentralChat({
  account,
}: {
  account: User;
}): Promise<void> {
  const first = await getOrCreateCentralChat(account.id);
  const again = await getOrCreateCentralChat(account.id);
  const atOnce = await Promise.all([
    getOrCreateCentralChat(account.id),
    getOrCreateCentralChat(account.id),
  ]);

  expect([again.id, ...atOnce.map(({ id }) => id)]).toEqual([
    first.id,
    first.id,
    first.id,
  ]);
  expect(first.kind).toBe("central");
  expect(await getChat(account.id, first.id)).toEqual(first);
  expect(await listMessages(account.id, first.id)).toEqual([]);
}

// Two users fetching their central chats at once each get their own.
async function fetchBothCentralChats({
  account,
  otherAccount,
}: {
  account: User;
  otherAccount: User;
}): Promise<void> {
  const [hers, theirs] = await Promise.all([
    getOrCreateCentralChat(account.id),
    getOrCreateCentralChat(otherAccount.id),
  ]);

  expect(hers.id).not.toBe(theirs.id);
}

// The other user reads, writes into and renames her central chat: each is
// not found, and her chat is unchanged.
async function useHerCentralChat({
  account,
  otherAccount,
}: {
  account: User;
  otherAccount: User;
}): Promise<void> {
  const hers = await getOrCreateCentralChat(account.id);

  expect(await getChat(otherAccount.id, hers.id)).toBeUndefined();
  expect(await listMessages(otherAccount.id, hers.id)).toEqual([]);
  expect(await saveMessage(otherAccount.id, hers.id, theirMessage())).toBe(
    "id-taken",
  );
  expect(
    await renameChat(otherAccount.id, hers.id, chatNameFixture("Theirs")),
  ).toBe(false);

  expect(await listMessages(account.id, hers.id)).toEqual([]);
  expect(await getChat(account.id, hers.id)).toEqual(hers);
}

// Her central chat is not among the chats of a project of hers.
async function listHerProjectChats({
  account,
  testData,
}: {
  account: User;
  testData: TestData;
}): Promise<void> {
  const project = await testData.project();
  const projectChat = await testData.chat(project);
  await getOrCreateCentralChat(account.id);

  expect((await listChats(account.id, project.id)).map(({ id }) => id)).toEqual(
    [projectChat.id],
  );
}

// Deleting an account deletes its central chat, and a new account at the
// same address gets a new one.
async function deleteHerAccount({
  newAddress,
  database,
}: {
  newAddress: string;
  database: Database;
}): Promise<void> {
  const account = await findOrCreateUser(newAddress);
  const hers = await getOrCreateCentralChat(account.id);

  await deleteAccount(account, database);

  expect(await getChat(account.id, hers.id)).toBeUndefined();
  const again = await findOrCreateUser(newAddress);
  expect((await getOrCreateCentralChat(again.id)).id).not.toBe(hers.id);
}

test.describe("use_case_private_data", () => {
  test(
    "her central chat is one chat, however it is fetched",
    fetchHerCentralChat,
  );
  test(
    "two users fetching their central chats at once each get their own",
    fetchBothCentralChats,
  );
  test(
    "another user's central chat and its messages are not found, and take no writes",
    useHerCentralChat,
  );
  test("a central chat is in no project's chats", listHerProjectChats);
  test("deleting an account deletes its central chat", deleteHerAccount);
});
