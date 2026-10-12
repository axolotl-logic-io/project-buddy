import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT, MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { startChat, startProject } from "@/chats/start-chat.ts";
import type {
  Chat,
  createChat,
  NewMessage,
  saveMessage,
} from "@/chats/store.ts";
import { AppError } from "@/errors/app-error.ts";
import { messageIdFixture } from "@/id-fixtures.ts";
import { EMPTY_MEMORY, MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import type { readMemory } from "@/memory/memory-store.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import type { createProject } from "@/projects/store.ts";
import type { writeChatOpening } from "@/tutor/chat-opening.ts";

const chatStore = vi.hoisted(() => ({
  createChat: vi.fn<typeof createChat>(),
  saveMessage: vi.fn<typeof saveMessage>(),
}));
vi.mock("@/chats/store.ts", () => chatStore);

const projectStore = vi.hoisted(() => ({
  createProject: vi.fn<typeof createProject>(),
}));
vi.mock("@/projects/store.ts", () => projectStore);

const memoryStore = vi.hoisted(() => ({
  readMemory: vi.fn<typeof readMemory>(),
}));
vi.mock("@/memory/memory-store.ts", () => memoryStore);

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

const SAVED_MEMORY = {
  text: "## Goal\n\n- A low-poly fox",
  version: MEMORY_VERSION_NUMBER.parse(1),
};

const STORAGE_FAILURE = new AppError("database-unreachable", new Error("x"));

beforeEach(() => {
  vi.clearAllMocks();
  chatStore.createChat.mockResolvedValue(CREATED_CHAT);
  chatStore.saveMessage.mockResolvedValue();
  projectStore.createProject.mockResolvedValue(FOX_PROJECT);
  memoryStore.readMemory.mockResolvedValue(SAVED_MEMORY);
  opening.writeChatOpening.mockResolvedValue(OPENING);
});

describe("startChat", () => {
  test("writes the opening from the project's name and memory and the persona", async () => {
    await startChat(FOX_PROJECT, "mr-tee");

    expect(memoryStore.readMemory).toHaveBeenCalledWith(FOX_PROJECT.id);
    expect(opening.writeChatOpening).toHaveBeenCalledWith({
      projectName: FOX_PROJECT.name,
      memory: SAVED_MEMORY,
      personaId: "mr-tee",
    });
  });

  test("then creates the chat in the project with the persona, and saves the opening in it", async () => {
    expect(await startChat(FOX_PROJECT, "mr-tee")).toEqual({
      kind: "started",
      chat: CREATED_CHAT,
    });

    expect(chatStore.createChat).toHaveBeenCalledWith({
      projectId: FOX_PROJECT.id,
      personaId: "mr-tee",
    });
    expect(chatStore.saveMessage).toHaveBeenCalledWith(
      CREATED_CHAT.id,
      OPENING,
    );
  });

  test("saves nothing when Claude can't write the opening", async () => {
    opening.writeChatOpening.mockResolvedValue(undefined);

    expect(await startChat(FOX_PROJECT, "mr-tee")).toEqual({
      kind: "claudeUnavailable",
    });
    expect(chatStore.createChat).not.toHaveBeenCalled();
    expect(chatStore.saveMessage).not.toHaveBeenCalled();
  });

  test("throws a failure to read the memory, asking Claude nothing", async () => {
    memoryStore.readMemory.mockRejectedValue(STORAGE_FAILURE);

    await expect(startChat(FOX_PROJECT, "hippy")).rejects.toBe(STORAGE_FAILURE);
    expect(opening.writeChatOpening).not.toHaveBeenCalled();
  });

  test("throws a failure to save the opening", async () => {
    chatStore.saveMessage.mockRejectedValue(STORAGE_FAILURE);

    await expect(startChat(FOX_PROJECT, "hippy")).rejects.toBe(STORAGE_FAILURE);
  });
});

describe("startProject", () => {
  test("writes the opening for the named project with empty memory, in the default persona", async () => {
    await startProject(FOX_PROJECT.name);

    expect(opening.writeChatOpening).toHaveBeenCalledWith({
      projectName: FOX_PROJECT.name,
      memory: EMPTY_MEMORY,
      personaId: DEFAULT_PERSONA_ID,
    });
    expect(memoryStore.readMemory).not.toHaveBeenCalled();
  });

  test("then creates the project and its chat, and saves the opening in it", async () => {
    expect(await startProject(FOX_PROJECT.name)).toEqual({
      kind: "started",
      chat: CREATED_CHAT,
    });

    expect(projectStore.createProject).toHaveBeenCalledWith(FOX_PROJECT.name);
    expect(chatStore.createChat).toHaveBeenCalledWith({
      projectId: FOX_PROJECT.id,
      personaId: DEFAULT_PERSONA_ID,
    });
    expect(chatStore.saveMessage).toHaveBeenCalledWith(
      CREATED_CHAT.id,
      OPENING,
    );
  });

  test("creates no project and no chat when Claude can't write the opening", async () => {
    opening.writeChatOpening.mockResolvedValue(undefined);

    expect(await startProject(FOX_PROJECT.name)).toEqual({
      kind: "claudeUnavailable",
    });
    expect(projectStore.createProject).not.toHaveBeenCalled();
    expect(chatStore.createChat).not.toHaveBeenCalled();
  });

  test("throws a failure to create the project", async () => {
    projectStore.createProject.mockRejectedValue(STORAGE_FAILURE);

    await expect(startProject(FOX_PROJECT.name)).rejects.toBe(STORAGE_FAILURE);
    expect(chatStore.createChat).not.toHaveBeenCalled();
  });
});
