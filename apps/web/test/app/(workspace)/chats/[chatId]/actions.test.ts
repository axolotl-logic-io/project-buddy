import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type RenameChatState,
  renameChatAction,
} from "@/app/(workspace)/chats/[chatId]/actions.ts";
import { CHAT_NAME_MAX_LENGTH } from "@/chats/chat-name.ts";
import type { renameChat } from "@/chats/store.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../../auth/current-user-test-kit.ts";
import {
  LINE_SEPARATOR,
  PARAGRAPH_SEPARATOR,
} from "../../../../chats/chat-name-fixtures.ts";
import { FOX_CHAT } from "../../page-fixtures.ts";

const store = vi.hoisted(() => ({ renameChat: vi.fn<typeof renameChat>() }));
vi.mock("@/chats/store.ts", () => store);

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);

const cache = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/cache", () => cache);

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

const IDLE: RenameChatState = { kind: "idle" };

function renameTo(name: string, chatId: string = FOX_CHAT.id): FormData {
  const data = new FormData();
  data.set("chatId", chatId);
  data.set("name", name);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.renameChat.mockResolvedValue(true);
});

describe("renameChatAction", () => {
  test("renames the chat to her name, trimmed, and shows the page again", async () => {
    expect(
      await renameChatAction(IDLE, renameTo("  Beveling the donut ")),
    ).toEqual({ kind: "renamed" });
    expect(store.renameChat).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_CHAT.id,
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

  test("is not found for a chat that is unknown or another user's", async () => {
    store.renameChat.mockResolvedValue(false);

    await expect(renameChatAction(IDLE, renameTo("Beveling"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(cache.refresh).not.toHaveBeenCalled();
  });

  test("sends a signed-out request to sign in, renaming nothing", async () => {
    signOut();

    await expect(renameChatAction(IDLE, renameTo("Beveling"))).rejects.toThrow(
      SIGNED_OUT_REDIRECT,
    );
    expect(store.renameChat).not.toHaveBeenCalled();
  });
});

describe("renameChatAction refusals", () => {
  test.each([
    ["an empty name", "", CHAT_NAME_COPY.needsName],
    ["a name of spaces", "   ", CHAT_NAME_COPY.needsName],
    [
      "too long a name",
      "a".repeat(CHAT_NAME_MAX_LENGTH + 1),
      CHAT_NAME_COPY.tooLong(CHAT_NAME_MAX_LENGTH),
    ],
    ["a name of two lines", "Beveling\nthe donut", CHAT_NAME_COPY.multiLine],
    [
      "a pasted Unicode line separator",
      `Beveling${LINE_SEPARATOR}the donut`,
      CHAT_NAME_COPY.multiLine,
    ],
    [
      "a pasted Unicode paragraph separator",
      `Beveling${PARAGRAPH_SEPARATOR}the donut`,
      CHAT_NAME_COPY.multiLine,
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
