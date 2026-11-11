// Unread marks are per user: each user sees only their own mark on a
// quest, and opening its conversation clears only the opener's. The second
// user's mark, on a quest they can't read, is set and read through the
// unread kit.
import { describe, expect, test } from "vitest";
import { markChatRead, markChatUnreadFor } from "@/chats/store.ts";
import { getProject } from "@/projects/store.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";
import {
  isUnreadFor,
  marksOn,
  markUnreadFor,
} from "../test-database/unread-test-kit.ts";

describe("use_case_open_unread_check_in", () => {
  test("opening a quest's conversation clears only her own mark", async () => {
    const { her, herData, other } = await twoUsers();
    const project = await herData.project();
    const chat = await herData.chat(project);
    await Promise.all([
      markUnreadFor(chat.id, her),
      markUnreadFor(chat.id, other),
    ]);
    expect((await getProject(her.id, project.id))?.unread).toBe(true);

    await markChatRead(her.id, chat.id);

    expect((await getProject(her.id, project.id))?.unread).toBe(false);
    expect(await isUnreadFor(chat.id, other)).toBe(true);
  });

  test("another user's mark on her quest doesn't show as unread to her", async () => {
    const { her, herData, other } = await twoUsers();
    const project = await herData.project();
    const chat = await herData.chat(project);
    await markUnreadFor(chat.id, other);

    expect((await getProject(her.id, project.id))?.unread).toBe(false);
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
