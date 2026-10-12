import { beforeEach, describe, expect, test, vi } from "vitest";
import { MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
import {
  LINE_SEPARATOR,
  PARAGRAPH_SEPARATOR,
} from "@/chats/chat-name-fixtures.ts";
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

function renameTo(name: string, chatId: string = MR_TEE_CHAT.id): FormData {
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
      MR_TEE_CHAT.id,
      "Beveling the donut",
    );
    expect(cache.refresh).toHaveBeenCalled();
  });

  test("is not found for a malformed chat id", async () => {
    await expect(
      renameChatAction(IDLE, renameTo("Beveling", "chat-1")),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(store.renameChat).not.toHaveBeenCalled();
  });
});

describe("renameChatAction refusals", () => {
  test.each([
    ["an empty name", "", COPY.chatName.needsName],
    ["a name of spaces", "   ", COPY.chatName.needsName],
    [
      "too long a name",
      "a".repeat(CHAT_NAME_MAX_LENGTH + 1),
      COPY.chatName.tooLong(CHAT_NAME_MAX_LENGTH),
    ],
    ["a name of two lines", "Beveling\nthe donut", COPY.chatName.multiLine],
    [
      "a pasted Unicode line separator",
      `Beveling${LINE_SEPARATOR}the donut`,
      COPY.chatName.multiLine,
    ],
    [
      "a pasted Unicode paragraph separator",
      `Beveling${PARAGRAPH_SEPARATOR}the donut`,
      COPY.chatName.multiLine,
    ],
  ])(
    "refuses %s, saying why and renaming nothing",
    async (_description, name, message) => {
      expect(await renameChatAction(IDLE, renameTo(name))).toEqual({
        kind: "invalid",
        message,
      });
      expect(store.renameChat).not.toHaveBeenCalled();
    },
  );
});
