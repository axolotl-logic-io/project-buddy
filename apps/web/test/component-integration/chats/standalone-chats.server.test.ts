import { expect, test, vi } from "vitest";
import { startChatAction } from "@/app/(workspace)/chats/actions.ts";
import type { NewMessage } from "@/chats/chat-rows.ts";
import { withAuthor } from "@/chats/message-author.ts";
import {
  createStandaloneChat,
  listStandaloneChats,
} from "@/chats/standalone-chat.ts";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import {
  cloneConstruct,
  deleteConstruct,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { messageIdFixture } from "../../support/id-fixtures.ts";
import { spendAllGold } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// The new-chat form for a standalone chat with the construct with this id.
function constructForm(constructId: string): FormData {
  const form = new FormData();
  form.set("projectId", "");
  form.set("constructId", constructId);
  return form;
}

test("lists multiple chats newest first, preserving the original conversation", async () => {
  const user = await testUser();
  const original = await createStandaloneChat(user.id);
  const message: NewMessage = {
    id: messageIdFixture(),
    role: "user",
    parts: [{ type: "text", text: "My idea" }],
  };
  await saveMessage(user.id, original.id, message);
  const next = await createStandaloneChat(user.id, getConstruct("mr-tee"));
  expect(next.id).not.toBe(original.id);
  expect((await listStandaloneChats(user.id)).map(({ id }) => id)).toEqual([
    next.id,
    original.id,
  ]);
  expect(await getChat(user.id, original.id)).toEqual(original);
  expect(await listMessages(user.id, original.id)).toEqual([
    withAuthor(message, { id: user.id, name: undefined, email: user.email }),
  ]);
});

test("starts with a built-in construct, no project and the construct's opening", async () => {
  const user = await testUser();
  await signIn(user);
  const starting = startChatAction({ kind: "idle" }, constructForm("mr-tee"));
  await Promise.allSettled([starting]);
  const [chat] = await listStandaloneChats(user.id);
  await expectRedirect(() => starting, `/chats/${chat?.id}`);
  expect(chat?.construct).toEqual({
    name: getConstruct("mr-tee").name,
    definition: getConstruct("mr-tee").definition,
  });
  expect(chat).toBeDefined();
  if (chat === undefined) {
    return;
  }
  const messages = await listMessages(user.id, chat.id);
  expect(messages.map(({ role }) => role)).toEqual(["assistant"]);
});

test("snapshots an owned construct and refuses another user's construct", async () => {
  const [user, other] = await Promise.all([testUser(), testUser()]);
  const [own, foreign] = await Promise.all([
    cloneConstruct(user.id, "mr-tee"),
    cloneConstruct(other.id, "hippy"),
  ]);
  expect(own).toBeDefined();
  expect(foreign).toBeDefined();
  if (own === undefined || foreign === undefined) {
    return;
  }
  await signIn(user);
  const starting = startChatAction({ kind: "idle" }, constructForm(own.id));
  await Promise.allSettled([starting]);
  const [started] = await listStandaloneChats(user.id);
  await expectRedirect(() => starting, `/chats/${started?.id}`);
  await updateConstruct(user.id, own.id, { name: "Changed" });
  await deleteConstruct(user.id, own.id);
  expect((await listStandaloneChats(user.id))[0]?.construct).toEqual({
    name: own.name,
    definition: own.definition,
  });
  expect(
    await startChatAction({ kind: "idle" }, constructForm(foreign.id)),
  ).toMatchObject({ kind: "invalid" });
  expect(
    await startChatAction({ kind: "idle" }, constructForm("unknown")),
  ).toMatchObject({ kind: "invalid" });
  expect(await listStandaloneChats(other.id)).toEqual([]);
  expect(await listStandaloneChats(user.id)).toHaveLength(1);
});

test("refuses new chats out of gold without hiding existing chats", async () => {
  const user = await testUser();
  const original = await createStandaloneChat(user.id);
  await spendAllGold(user);
  await signIn(user);
  expect(
    await startChatAction({ kind: "idle" }, constructForm("hippy")),
  ).toMatchObject({ kind: "outOfGold" });
  expect(await listStandaloneChats(user.id)).toEqual([original]);
});
