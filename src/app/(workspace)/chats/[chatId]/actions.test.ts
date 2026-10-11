import { beforeEach, describe, expect, test, vi } from "vitest";
import { MR_T_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
import type { renameChat } from "@/chats/store.ts";
import { COPY } from "@/ui/copy.ts";
import { type RenameChatState, renameChatAction } from "./actions.ts";

const store = vi.hoisted(() => ({ renameChat: vi.fn<typeof renameChat>() }));
vi.mock("@/chats/store.ts", () => store);

const cache = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/cache", () => cache);

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

const IDLE: RenameChatState = { kind: "idle" };

function renameTo(name: string, chatId: string = MR_T_CHAT.id): FormData {
  const data = new FormData();
  data.set("chatId", chatId);
  data.set("name", name);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.renameChat.mockResolvedValue();
});

describe("renameChatAction", () => {
  test("renames the chat to her name, trimmed, and shows the page again", async () => {
    expect(
      await renameChatAction(IDLE, renameTo("  Beveling the donut ")),
    ).toEqual({ kind: "renamed" });
    expect(store.renameChat).toHaveBeenCalledWith(
      MR_T_CHAT.id,
      "Beveling the donut",
    );
    expect(cache.refresh).toHaveBeenCalled();
  });

  test.each([
    ["an empty name", ""],
    ["a name of spaces", "   "],
  ])(
    "asks for a name, renaming nothing, for %s",
    async (_description, name) => {
      expect(await renameChatAction(IDLE, renameTo(name))).toEqual({
        kind: "invalid",
        message: COPY.chatName.needsName,
      });
      expect(store.renameChat).not.toHaveBeenCalled();
    },
  );

  test.each([
    ["too long a name", "a".repeat(CHAT_NAME_MAX_LENGTH + 1)],
    ["a name of two lines", "Beveling\nthe donut"],
  ])(
    "says what a name may be, renaming nothing, for %s",
    async (_description, name) => {
      expect(await renameChatAction(IDLE, renameTo(name))).toEqual({
        kind: "invalid",
        message: COPY.chatName.tooLong(CHAT_NAME_MAX_LENGTH),
      });
      expect(store.renameChat).not.toHaveBeenCalled();
    },
  );

  test("is not found for a malformed chat id", async () => {
    await expect(
      renameChatAction(IDLE, renameTo("Beveling", "chat-1")),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(store.renameChat).not.toHaveBeenCalled();
  });
});
