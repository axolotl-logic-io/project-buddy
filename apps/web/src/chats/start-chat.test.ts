import { beforeEach, describe, expect, test, vi } from "vitest";
import type { readUserName } from "@/accounts/users-store.ts";
import { FOX_CHAT, FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
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
import { DEFAULT_PERSONA_ID, getPersona } from "@/personas/index.ts";
import type { checkQuota } from "@/quota/quota.ts";
import { quotaGrantFixture } from "@/quota/quota-test-kit.ts";
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

const usersStore = vi.hoisted(() => ({
  readUserName: vi.fn<typeof readUserName>(),
}));
vi.mock("@/accounts/users-store.ts", () => usersStore);

const opening = vi.hoisted(() => ({
  writeChatOpening: vi.fn<typeof writeChatOpening>(),
}));
vi.mock("@/tutor/chat-opening.ts", () => opening);

const quota = vi.hoisted(() => ({
  checkQuota: vi.fn<typeof checkQuota>(),
}));
vi.mock("@/quota/quota.ts", () => quota);

const OWNER = userIdFixture();
const MR_TEE = getPersona("mr-tee");
const HIPPY = getPersona("hippy");
const DEFAULT_PERSONA = getPersona(DEFAULT_PERSONA_ID);
const GRANT = quotaGrantFixture(OWNER);

// The chat as the new-chat store creates it.
const CREATED_CHAT: Chat = {
  id: FOX_CHAT.id,
  projectId: FOX_CHAT.projectId,
  persona: FOX_CHAT.persona,
  createdAt: FOX_CHAT.createdAt,
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

const RESETS_ON = new Date("2026-11-01T00:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  newChatStore.createChatWithOpening.mockResolvedValue(CREATED_CHAT);
  newChatStore.createProjectWithChat.mockResolvedValue(CREATED_CHAT);
  memoryStore.readMemory.mockResolvedValue(SAVED_MEMORY);
  usersStore.readUserName.mockResolvedValue(undefined);
  opening.writeChatOpening.mockResolvedValue(OPENING);
  quota.checkQuota.mockResolvedValue({ kind: "withinQuota", grant: GRANT });
});

// The owner's quota is used up until RESETS_ON.
function quotaUsedUp(): void {
  quota.checkQuota.mockResolvedValue({ kind: "usedUp", resetsOn: RESETS_ON });
}

describe("startChat", () => {
  test("writes a lesson's opening, not the interview's, from the owner's project's name and memory and the persona", async () => {
    await startChat(OWNER, FOX_PROJECT, MR_TEE);

    expect(memoryStore.readMemory).toHaveBeenCalledWith(OWNER, FOX_PROJECT.id);
    expect(quota.checkQuota).toHaveBeenCalledWith(OWNER);
    expect(opening.writeChatOpening).toHaveBeenCalledWith({
      grant: GRANT,
      projectName: FOX_PROJECT.name,
      isInterviewChat: false,
      memory: SAVED_MEMORY,
      persona: MR_TEE,
      userName: undefined,
    });
  });

  test("then saves the chat, in the project with the persona, with its opening", async () => {
    expect(await startChat(OWNER, FOX_PROJECT, MR_TEE)).toEqual({
      kind: "started",
      chat: CREATED_CHAT,
    });

    expect(newChatStore.createChatWithOpening).toHaveBeenCalledWith(
      OWNER,
      { projectId: FOX_PROJECT.id, persona: MR_TEE },
      OPENING,
    );
  });

  test("saves nothing when Claude can't write the opening", async () => {
    opening.writeChatOpening.mockResolvedValue(undefined);

    expect(await startChat(OWNER, FOX_PROJECT, MR_TEE)).toEqual({
      kind: "claudeUnavailable",
    });
    expect(newChatStore.createChatWithOpening).not.toHaveBeenCalled();
  });

  test("throws a failure to read the memory, asking Claude nothing", async () => {
    memoryStore.readMemory.mockRejectedValue(STORAGE_FAILURE);

    await expect(startChat(OWNER, FOX_PROJECT, HIPPY)).rejects.toBe(
      STORAGE_FAILURE,
    );
    expect(opening.writeChatOpening).not.toHaveBeenCalled();
  });

  test("throws a failure to save the chat", async () => {
    newChatStore.createChatWithOpening.mockRejectedValue(STORAGE_FAILURE);

    await expect(startChat(OWNER, FOX_PROJECT, HIPPY)).rejects.toBe(
      STORAGE_FAILURE,
    );
  });
});

describe("startProject", () => {
  test("writes the interview chat's opening for the named project with empty memory", async () => {
    await startProject(OWNER, FOX_PROJECT.name, DEFAULT_PERSONA);

    expect(quota.checkQuota).toHaveBeenCalledWith(OWNER);
    expect(opening.writeChatOpening).toHaveBeenCalledWith({
      grant: GRANT,
      projectName: FOX_PROJECT.name,
      isInterviewChat: true,
      memory: EMPTY_MEMORY,
      persona: DEFAULT_PERSONA,
      userName: undefined,
    });
    expect(memoryStore.readMemory).not.toHaveBeenCalled();
  });

  test("then saves the owner's project, its chat and the opening together", async () => {
    expect(
      await startProject(OWNER, FOX_PROJECT.name, DEFAULT_PERSONA),
    ).toEqual({
      kind: "started",
      chat: CREATED_CHAT,
    });

    expect(newChatStore.createProjectWithChat).toHaveBeenCalledWith(
      OWNER,
      FOX_PROJECT.name,
      { persona: DEFAULT_PERSONA, opening: OPENING },
    );
  });

  test("creates no project and no chat when Claude can't write the opening", async () => {
    opening.writeChatOpening.mockResolvedValue(undefined);

    expect(
      await startProject(OWNER, FOX_PROJECT.name, DEFAULT_PERSONA),
    ).toEqual({
      kind: "claudeUnavailable",
    });
    expect(newChatStore.createProjectWithChat).not.toHaveBeenCalled();
  });

  test("throws a failure to save the project", async () => {
    newChatStore.createProjectWithChat.mockRejectedValue(STORAGE_FAILURE);

    await expect(
      startProject(OWNER, FOX_PROJECT.name, DEFAULT_PERSONA),
    ).rejects.toBe(STORAGE_FAILURE);
  });
});

describe("startProject in a chosen persona", () => {
  test("writes the opening and saves the chat in the given persona", async () => {
    await startProject(OWNER, FOX_PROJECT.name, MR_TEE);

    expect(opening.writeChatOpening).toHaveBeenCalledWith(
      expect.objectContaining({ persona: MR_TEE }),
    );
    expect(newChatStore.createProjectWithChat).toHaveBeenCalledWith(
      OWNER,
      FOX_PROJECT.name,
      { persona: MR_TEE, opening: OPENING },
    );
  });

  test("writes the opening and saves the chat in a snapshot of her own persona, under the default persona's id", async () => {
    const own = {
      id: DEFAULT_PERSONA_ID,
      name: "Fox Guide",
      parts: MR_TEE.parts,
    };

    await startProject(OWNER, FOX_PROJECT.name, own);

    expect(opening.writeChatOpening).toHaveBeenCalledWith(
      expect.objectContaining({ persona: own }),
    );
    expect(newChatStore.createProjectWithChat).toHaveBeenCalledWith(
      OWNER,
      FOX_PROJECT.name,
      { persona: own, opening: OPENING },
    );
  });
});

describe("startChat and startProject with the owner's name", () => {
  const Named = {
    ...MR_TEE,
    parts: { ...MR_TEE.parts, voice: "Hi {{name}}" },
  };

  beforeEach(() => {
    usersStore.readUserName.mockResolvedValue("Mabel");
  });

  test("startChat writes the opening with her name and saves the persona as written", async () => {
    await startChat(OWNER, FOX_PROJECT, Named);

    expect(usersStore.readUserName).toHaveBeenCalledWith(OWNER);
    expect(opening.writeChatOpening).toHaveBeenCalledWith(
      expect.objectContaining({ persona: Named, userName: "Mabel" }),
    );
    expect(newChatStore.createChatWithOpening).toHaveBeenCalledWith(
      OWNER,
      { projectId: FOX_PROJECT.id, persona: Named },
      OPENING,
    );
    expect(Named.parts.voice).toBe("Hi {{name}}");
  });

  test("startProject writes the opening with her name and saves the persona as written", async () => {
    await startProject(OWNER, FOX_PROJECT.name, Named);

    expect(usersStore.readUserName).toHaveBeenCalledWith(OWNER);
    expect(opening.writeChatOpening).toHaveBeenCalledWith(
      expect.objectContaining({ persona: Named, userName: "Mabel" }),
    );
    expect(newChatStore.createProjectWithChat).toHaveBeenCalledWith(
      OWNER,
      FOX_PROJECT.name,
      { persona: Named, opening: OPENING },
    );
  });
});

describe("startChat and startProject once her quota is used up", () => {
  test("startChat asks Claude nothing and saves nothing", async () => {
    quotaUsedUp();

    expect(await startChat(OWNER, FOX_PROJECT, MR_TEE)).toEqual({
      kind: "quotaUsedUp",
      resetsOn: RESETS_ON,
    });
    expect(opening.writeChatOpening).not.toHaveBeenCalled();
    expect(newChatStore.createChatWithOpening).not.toHaveBeenCalled();
  });

  test("startProject asks Claude nothing and creates no project", async () => {
    quotaUsedUp();

    expect(
      await startProject(OWNER, FOX_PROJECT.name, DEFAULT_PERSONA),
    ).toEqual({
      kind: "quotaUsedUp",
      resetsOn: RESETS_ON,
    });
    expect(opening.writeChatOpening).not.toHaveBeenCalled();
    expect(newChatStore.createProjectWithChat).not.toHaveBeenCalled();
  });
});
