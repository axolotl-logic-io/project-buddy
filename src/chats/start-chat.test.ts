import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT, MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import type { Chat, NewMessage } from "@/chats/chat-rows.ts";
import type {
  createChatWithOpening,
  createProjectWithChat,
} from "@/chats/new-chat-store.ts";
import { startChat, startProject } from "@/chats/start-chat.ts";
import { AppError } from "@/errors/app-error.ts";
import { messageIdFixture, userIdFixture } from "@/id-fixtures.ts";
import { EMPTY_MEMORY, MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import type { readMemory } from "@/memory/memory-store.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import type { writeChatOpening } from "@/tutor/chat-opening.ts";

const newChatStore = vi.hoisted(() => ({
  createChatWithOpening: vi.fn<typeof createChatWithOpening>(),
  createProjectWithChat: vi.fn<typeof createProjectWithChat>(),
}));
vi.mock("@/chats/new-chat-store.ts", () => newChatStore);

const memoryStore = vi.hoisted(() => ({
  readMemory: vi.fn<typeof readMemory>(),
}));
vi.mock("@/memory/memory-store.ts", () => memoryStore);

const opening = vi.hoisted(() => ({
  writeChatOpening: vi.fn<typeof writeChatOpening>(),
}));
vi.mock("@/tutor/chat-opening.ts", () => opening);

const OWNER = userIdFixture();

// The chat as the new-chat store creates it.
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

const SAVED_MEMORY = {
  text: "## Goal\n\n- A low-poly fox",
  version: MEMORY_VERSION_NUMBER.parse(1),
};

const STORAGE_FAILURE = new AppError("database-unreachable", new Error("x"));

beforeEach(() => {
  vi.clearAllMocks();
  newChatStore.createChatWithOpening.mockResolvedValue(CREATED_CHAT);
  newChatStore.createProjectWithChat.mockResolvedValue(CREATED_CHAT);
  memoryStore.readMemory.mockResolvedValue(SAVED_MEMORY);
  opening.writeChatOpening.mockResolvedValue(OPENING);
});

describe("startChat", () => {
  test("writes the opening from the owner's project's name and memory and the persona", async () => {
    await startChat(OWNER, FOX_PROJECT, "mr-tee");

    expect(memoryStore.readMemory).toHaveBeenCalledWith(OWNER, FOX_PROJECT.id);
    expect(opening.writeChatOpening).toHaveBeenCalledWith({
      projectName: FOX_PROJECT.name,
      memory: SAVED_MEMORY,
      personaId: "mr-tee",
    });
  });

  test("then saves the chat, in the project with the persona, with its opening", async () => {
    expect(await startChat(OWNER, FOX_PROJECT, "mr-tee")).toEqual({
      kind: "started",
      chat: CREATED_CHAT,
    });

    expect(newChatStore.createChatWithOpening).toHaveBeenCalledWith(
      OWNER,
      { projectId: FOX_PROJECT.id, personaId: "mr-tee" },
      OPENING,
    );
  });

  test("saves nothing when Claude can't write the opening", async () => {
    opening.writeChatOpening.mockResolvedValue(undefined);

    expect(await startChat(OWNER, FOX_PROJECT, "mr-tee")).toEqual({
      kind: "claudeUnavailable",
    });
    expect(newChatStore.createChatWithOpening).not.toHaveBeenCalled();
  });

  test("throws a failure to read the memory, asking Claude nothing", async () => {
    memoryStore.readMemory.mockRejectedValue(STORAGE_FAILURE);

    await expect(startChat(OWNER, FOX_PROJECT, "hippy")).rejects.toBe(
      STORAGE_FAILURE,
    );
    expect(opening.writeChatOpening).not.toHaveBeenCalled();
  });

  test("throws a failure to save the chat", async () => {
    newChatStore.createChatWithOpening.mockRejectedValue(STORAGE_FAILURE);

    await expect(startChat(OWNER, FOX_PROJECT, "hippy")).rejects.toBe(
      STORAGE_FAILURE,
    );
  });
});

describe("startProject", () => {
  test("writes the opening for the named project with empty memory, in the default persona", async () => {
    await startProject(OWNER, FOX_PROJECT.name);

    expect(opening.writeChatOpening).toHaveBeenCalledWith({
      projectName: FOX_PROJECT.name,
      memory: EMPTY_MEMORY,
      personaId: DEFAULT_PERSONA_ID,
    });
    expect(memoryStore.readMemory).not.toHaveBeenCalled();
  });

  test("then saves the owner's project, its chat and the opening together", async () => {
    expect(await startProject(OWNER, FOX_PROJECT.name)).toEqual({
      kind: "started",
      chat: CREATED_CHAT,
    });

    expect(newChatStore.createProjectWithChat).toHaveBeenCalledWith(
      OWNER,
      FOX_PROJECT.name,
      { personaId: DEFAULT_PERSONA_ID, opening: OPENING },
    );
  });

  test("creates no project and no chat when Claude can't write the opening", async () => {
    opening.writeChatOpening.mockResolvedValue(undefined);

    expect(await startProject(OWNER, FOX_PROJECT.name)).toEqual({
      kind: "claudeUnavailable",
    });
    expect(newChatStore.createProjectWithChat).not.toHaveBeenCalled();
  });

  test("throws a failure to save the project", async () => {
    newChatStore.createProjectWithChat.mockRejectedValue(STORAGE_FAILURE);

    await expect(startProject(OWNER, FOX_PROJECT.name)).rejects.toBe(
      STORAGE_FAILURE,
    );
  });
});
