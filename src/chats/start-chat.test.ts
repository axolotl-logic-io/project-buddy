import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT, MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { startChat } from "@/chats/start-chat.ts";
import type {
  Chat,
  createChat,
  NewMessage,
  saveMessage,
} from "@/chats/store.ts";
import { AppError } from "@/errors/app-error.ts";
import { messageIdFixture } from "@/id-fixtures.ts";
import type { writeChatOpening } from "@/tutor/chat-opening.ts";

const chatStore = vi.hoisted(() => ({
  createChat: vi.fn<typeof createChat>(),
  saveMessage: vi.fn<typeof saveMessage>(),
}));
vi.mock("@/chats/store.ts", () => chatStore);

const opening = vi.hoisted(() => ({
  writeChatOpening: vi.fn<typeof writeChatOpening>(),
}));
vi.mock("@/tutor/chat-opening.ts", () => opening);

// The chat as the chats store creates it.
const CREATED_CHAT: Chat = {
  id: MR_TEE_CHAT.id,
  projectId: MR_TEE_CHAT.projectId,
  personaId: MR_TEE_CHAT.personaId,
  createdAt: MR_TEE_CHAT.createdAt,
  name: undefined,
  renamedByHand: false,
};

const OPENING: NewMessage = {
  id: messageIdFixture("opening-1"),
  role: "assistant",
  parts: [{ type: "text", text: "What are we building, fool?" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  chatStore.createChat.mockResolvedValue(CREATED_CHAT);
  chatStore.saveMessage.mockResolvedValue();
  opening.writeChatOpening.mockResolvedValue(OPENING);
});

describe("startChat", () => {
  test("creates the chat in the project with the persona", async () => {
    expect(await startChat(FOX_PROJECT, "mr-tee")).toEqual(CREATED_CHAT);

    expect(chatStore.createChat).toHaveBeenCalledWith({
      projectId: FOX_PROJECT.id,
      personaId: "mr-tee",
    });
  });

  test("saves the tutor's opening, written for the chat and its project", async () => {
    await startChat(FOX_PROJECT, "mr-tee");

    expect(opening.writeChatOpening).toHaveBeenCalledWith({
      ...CREATED_CHAT,
      projectName: FOX_PROJECT.name,
    });
    expect(chatStore.saveMessage).toHaveBeenCalledWith(
      CREATED_CHAT.id,
      OPENING,
    );
  });

  test("throws a storage failure, writing no opening if the chat isn't made", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    chatStore.createChat.mockRejectedValue(failure);

    await expect(startChat(FOX_PROJECT, "hippy")).rejects.toBe(failure);
    expect(opening.writeChatOpening).not.toHaveBeenCalled();
  });

  test("throws a failure to save the opening", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    chatStore.saveMessage.mockRejectedValue(failure);

    await expect(startChat(FOX_PROJECT, "hippy")).rejects.toBe(failure);
  });
});
