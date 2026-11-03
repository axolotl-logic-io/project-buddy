// Unread marks are per user: each user sees only their own marks, on the
// Chats page and in Today, and opening a chat clears only the opener's.
// Until members can share a chat (#626), the second user's mark is set and
// read through the unread kit.
import { describe, expect, test } from "vitest";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import { listAllChats } from "@/chats/all-chats.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { markChatUnreadFor } from "@/chats/store.ts";
import type { ChatId } from "@/ids.ts";
import { readToday } from "@/today/today-store.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";
import {
  isUnreadFor,
  marksOn,
  markUnreadFor,
} from "../test-database/unread-test-kit.ts";

// Whether the chat with this id is unread in the list.
function unreadIn(chats: readonly Chat[], id: ChatId): boolean | undefined {
  return chats.find((chat) => chat.id === id)?.unread;
}

// Opens the chat's page, as the signed-in user.
async function openChat(id: ChatId): Promise<void> {
  await ChatPage({
    params: Promise.resolve({ chatId: id }),
    searchParams: Promise.resolve({}),
  });
}

describe("use_case_open_unread_check_in", () => {
  test("opening a chat clears only her own mark, and her lists show only hers", async () => {
    const { her, herData, other } = await twoUsers();
    const project = await herData.project();
    // The marked chat is older, so Today lists it among the chats rather
    // than as the project's chat to continue.
    const marked = await herData.chat(project);
    await herData.chat(project);
    await Promise.all([
      markUnreadFor(marked.id, her),
      markUnreadFor(marked.id, other),
    ]);
    const [chatsBefore, todayBefore] = await Promise.all([
      listAllChats(her.id),
      readToday(her.id),
    ]);
    expect(unreadIn(chatsBefore, marked.id)).toBe(true);
    expect(unreadIn(todayBefore.chats, marked.id)).toBe(true);

    await openChat(marked.id);

    const [chatsAfter, todayAfter, otherStillUnread] = await Promise.all([
      listAllChats(her.id),
      readToday(her.id),
      isUnreadFor(marked.id, other),
    ]);
    expect(unreadIn(chatsAfter, marked.id)).toBe(false);
    expect(unreadIn(todayAfter.chats, marked.id)).toBe(false);
    expect(otherStillUnread).toBe(true);
  });

  test("another user's mark on her chat doesn't show as unread to her", async () => {
    const { her, herData, other } = await twoUsers();
    const project = await herData.project();
    const chat = await herData.chat(project);
    await markUnreadFor(chat.id, other);

    expect(unreadIn(await listAllChats(her.id), chat.id)).toBe(false);
  });
});

describe("markChatUnreadFor", () => {
  test("marks each user who can read the chat once, however often named or already marked", async () => {
    const { her, herData, other } = await twoUsers();
    const chat = await herData.chat(await herData.project());
    await markUnreadFor(chat.id, her);

    await markChatUnreadFor(chat.id, [her.id, her.id, other.id, her.id]);
    await markChatUnreadFor(chat.id, [her.id]);

    const [herMark, otherMark, marks] = await Promise.all([
      isUnreadFor(chat.id, her),
      isUnreadFor(chat.id, other),
      marksOn(chat.id),
    ]);
    expect(herMark).toBe(true);
    expect(otherMark).toBe(false);
    expect(marks).toBe(1);
  });
});
