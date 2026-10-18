import { expect, test, vi } from "vitest";
import { startStandaloneChatAction } from "@/app/(workspace)/chat/actions.ts";
import { cloneBuddy, deleteBuddy, updateBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import { createCentralChat, listCentralChats } from "@/chats/central-chat.ts";
import type { NewMessage } from "@/chats/chat-rows.ts";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { messageIdFixture } from "../id-fixtures.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { spend } from "../test-database/spend-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buddyForm(buddyId: string): FormData {
  const form = new FormData();
  form.set("buddyId", buddyId);
  return form;
}

test("lists multiple chats newest first, preserving the original conversation", async () => {
  const user = await testUser();
  const original = await createCentralChat(user.id);
  const message: NewMessage = {
    id: messageIdFixture(),
    role: "user",
    parts: [{ type: "text", text: "My idea" }],
  };
  await saveMessage(user.id, original.id, message);
  const next = await createCentralChat(user.id, getBuddy("mr-tee"));
  expect(next.id).not.toBe(original.id);
  expect((await listCentralChats(user.id)).map(({ id }) => id)).toEqual([
    next.id,
    original.id,
  ]);
  expect(await getChat(user.id, original.id)).toEqual(original);
  expect(await listMessages(user.id, original.id)).toEqual([message]);
});

test("starts with a built-in buddy and no project or model opening", async () => {
  const user = await testUser();
  await signIn(user);
  const starting = startStandaloneChatAction(
    { kind: "idle" },
    buddyForm("mr-tee"),
  );
  await Promise.allSettled([starting]);
  const [chat] = await listCentralChats(user.id);
  await expectRedirect(() => starting, `/chats/${chat?.id}`);
  expect(chat?.buddy).toEqual({
    name: getBuddy("mr-tee").name,
    parts: getBuddy("mr-tee").parts,
  });
  expect(chat).toBeDefined();
  if (chat === undefined) {
    return;
  }
  expect(await listMessages(user.id, chat.id)).toEqual([]);
});

test("snapshots an owned buddy and refuses another user's buddy", async () => {
  const user = await testUser();
  const other = await testUser();
  const own = await cloneBuddy(user.id, "mr-tee");
  const foreign = await cloneBuddy(other.id, "hippy");
  expect(own).toBeDefined();
  expect(foreign).toBeDefined();
  if (own === undefined || foreign === undefined) {
    return;
  }
  await signIn(user);
  const starting = startStandaloneChatAction(
    { kind: "idle" },
    buddyForm(own.id),
  );
  await Promise.allSettled([starting]);
  const [started] = await listCentralChats(user.id);
  await expectRedirect(() => starting, `/chats/${started?.id}`);
  await updateBuddy(user.id, own.id, { name: "Changed" });
  await deleteBuddy(user.id, own.id);
  expect((await listCentralChats(user.id))[0]?.buddy).toEqual({
    name: own.name,
    parts: own.parts,
  });
  expect(
    await startStandaloneChatAction({ kind: "idle" }, buddyForm(foreign.id)),
  ).toMatchObject({ kind: "invalid" });
  expect(
    await startStandaloneChatAction({ kind: "idle" }, buddyForm("unknown")),
  ).toMatchObject({ kind: "invalid" });
  expect(await listCentralChats(other.id)).toEqual([]);
  expect(await listCentralChats(user.id)).toHaveLength(1);
});

test("refuses new chats over quota without hiding existing chats", async () => {
  const user = await testUser();
  const original = await createCentralChat(user.id);
  await spend(user, MONTHLY_QUOTA_MICRO_USD);
  await signIn(user);
  expect(
    await startStandaloneChatAction({ kind: "idle" }, buddyForm("hippy")),
  ).toMatchObject({ kind: "quotaUsedUp" });
  expect(await listCentralChats(user.id)).toEqual([original]);
});
