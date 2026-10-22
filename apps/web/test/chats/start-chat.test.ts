// An unavailable preference read must not be confused with an account that
// has no saved choices: doing so would silently enable disabled skills.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import {
  createChatWithOpening,
  createProjectWithChat,
} from "@/chats/new-chat-store.ts";
import {
  type StartChatResult,
  startChat,
  startProject,
} from "@/chats/start-chat.ts";
import { AppError } from "@/errors/app-error.ts";
import { writeChatOpening } from "@/tutor/chat-opening.ts";
import { readPromptPreferences } from "../accounts/users-store-test-kit.ts";
import { FOX_PROJECT } from "../app/(workspace)/page-fixtures.ts";
import {
  checkQuota,
  OWNER,
  resetReplyTestKit,
} from "../tutor/reply-test-kit.ts";

vi.mock(
  "@/accounts/users-store.ts",
  () => import("../accounts/users-store-test-kit.ts"),
);
vi.mock("@/memory/memory-store.ts", () => import("../tutor/reply-test-kit.ts"));
vi.mock("@/quota/quota.ts", () => import("../tutor/reply-test-kit.ts"));
vi.mock("@/chats/new-chat-store.ts", () => ({
  createChatWithOpening: vi.fn(),
  createProjectWithChat: vi.fn(),
}));
vi.mock("@/tutor/chat-opening.ts", () => ({ writeChatOpening: vi.fn() }));

beforeEach(() => {
  resetReplyTestKit();
  vi.mocked(createChatWithOpening).mockReset();
  vi.mocked(createProjectWithChat).mockReset();
  vi.mocked(writeChatOpening).mockReset();
  readPromptPreferences.mockReset();
});

describe.each([
  {
    kind: "project interview",
    start: (): Promise<StartChatResult> =>
      startProject(OWNER, FOX_PROJECT.name, getBuddy("mr-tee")),
  },
  {
    kind: "project lesson",
    start: (): Promise<StartChatResult> =>
      startChat(OWNER, FOX_PROJECT, getBuddy("mr-tee")),
  },
])("$kind opening preferences", ({ start }) => {
  test("a failed account read stops the opening without saving anything", async () => {
    const failure = new AppError(
      "database-unreachable",
      new Error("Account preferences unavailable"),
    );
    readPromptPreferences.mockRejectedValue(failure);

    await expect(start()).rejects.toBe(failure);

    expect(readPromptPreferences).toHaveBeenCalledWith(OWNER);
    expect(writeChatOpening).not.toHaveBeenCalled();
    expect(createChatWithOpening).not.toHaveBeenCalled();
    expect(createProjectWithChat).not.toHaveBeenCalled();
  });

  test("exhausted quota still refuses an opening even if preferences are unavailable", async () => {
    const resetsOn = new Date("2026-11-01T00:00:00Z");
    checkQuota.mockResolvedValue({ kind: "usedUp", resetsOn });
    readPromptPreferences.mockRejectedValue(
      new AppError("database-unreachable", new Error("Unavailable")),
    );

    await expect(start()).resolves.toEqual({ kind: "quotaUsedUp", resetsOn });

    expect(readPromptPreferences).not.toHaveBeenCalled();
    expect(writeChatOpening).not.toHaveBeenCalled();
    expect(createChatWithOpening).not.toHaveBeenCalled();
    expect(createProjectWithChat).not.toHaveBeenCalled();
  });
});
