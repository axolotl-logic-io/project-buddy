// A chat's name (use-cases/chats.md), as the server saves it: the mock
// tutor names a chat from her messages through POST /api/chat, and her own
// name, saved by the rename action, is kept. The chat page's heading and the
// project's list show the saved name; how they show it is page.test.tsx's
// and the project page's tests'.
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { sendChatMessage } from "@/app/api/chat/chat-request-test-kit.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { getChat, listChats } from "@/chats/store.ts";
import { testData } from "@/test-database/data-test-kit.ts";
import { signIn } from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";
import { mockChatName } from "@/tutor/mock-chat-name.ts";
import { renameChatAction } from "./actions.ts";

vi.mock("next/server", async (importOriginal) => {
  const kit = await import("@/app/api/chat/chat-request-test-kit.ts");
  return {
    ...(await importOriginal<typeof import("next/server")>()),
    after: kit.after,
    connection: kit.connection,
  };
});

// refresh() re-renders the page a Server Action was called from, and
// throws outside one.
vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // A server test has no page to re-render.
  },
}));

// The messages the naming call is sent after her first message and its
// reply, and after her third: a chat made by testData has no opening.
const AFTER_FIRST_EXCHANGE = 2;
const AFTER_THIRD_EXCHANGE = 6;

// A signed-in test user's new chat with Mr. Tee.
async function signedInChat(): Promise<{ user: User; chat: Chat }> {
  const user = await testUser();
  await signIn(user);
  const data = testData(user);
  const chat = await data.chat(await data.project(), "mr-tee");
  return { user, chat };
}

// The chat's saved name, if it has one.
async function savedName(user: User, chat: Chat): Promise<string | undefined> {
  return (await getChat(user.id, chat.id))?.name;
}

// How the chat's project lists it: its name and its buddy's.
async function listedAs(
  user: User,
  chat: Chat,
): Promise<{ name: string | undefined; buddy: string } | undefined> {
  const listed = (await listChats(user.id, chat.projectId)).find(
    ({ id }) => id === chat.id,
  );
  if (listed === undefined) {
    return undefined;
  }
  return { name: listed.name, buddy: listed.buddy.name };
}

// The rename form's data for chat and name.
function renameForm(chat: Chat, name: string): FormData {
  const form = new FormData();
  form.set("chatId", chat.id);
  form.set("name", name);
  return form;
}

describe("use_case_chat_named_automatically", () => {
  test("her first message names the chat, her second keeps the name and her third renames it", async () => {
    const { user, chat } = await signedInChat();
    const first = "Bevel a doughnut";
    const firstName = mockChatName(first, AFTER_FIRST_EXCHANGE);

    expect(await savedName(user, chat)).toBeUndefined();

    await sendChatMessage(chat.id, first);

    expect(await savedName(user, chat)).toBe(firstName);
    expect(await listedAs(user, chat)).toEqual({
      name: firstName,
      buddy: chat.buddy.name,
    });

    await sendChatMessage(chat.id, "Make it rounder");

    expect(await savedName(user, chat)).toBe(firstName);

    await sendChatMessage(chat.id, "Now add sprinkles");

    expect(await savedName(user, chat)).toBe(
      mockChatName(first, AFTER_THIRD_EXCHANGE),
    );
  });
});

describe("use_case_rename_chat", () => {
  test("her name is saved, and her later messages don't change it", async () => {
    const { user, chat } = await signedInChat();
    const herName = "Doughnut bevels";

    expect(
      await renameChatAction({ kind: "idle" }, renameForm(chat, herName)),
    ).toEqual({ kind: "renamed" });
    expect(await savedName(user, chat)).toBe(herName);

    await sendChatMessage(chat.id, "Bevel a doughnut");
    await sendChatMessage(chat.id, "Make it rounder");
    await sendChatMessage(chat.id, "Now add sprinkles");

    expect(await savedName(user, chat)).toBe(herName);
    expect(await listedAs(user, chat)).toEqual({
      name: herName,
      buddy: chat.buddy.name,
    });
  });
});
