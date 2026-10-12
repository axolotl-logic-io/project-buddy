import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import { FOX_PROJECT, MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import type { createChat } from "@/chats/store.ts";
import { AppError } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

const store = vi.hoisted(() => ({ createChat: vi.fn<typeof createChat>() }));
vi.mock("@/chats/store.ts", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

const IDLE: StartChatState = { kind: "idle" };
const CHOOSE_PERSONA: StartChatState = {
  kind: "invalid",
  message: COPY.newChat.choosePersona,
};
const CHOOSE_PROJECT: StartChatState = {
  kind: "invalid",
  message: COPY.newChat.chooseProject,
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

function start(fields: Record<string, string>): Promise<StartChatState> {
  return startChatAction(IDLE, form(fields));
}

describe("startChatAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.createChat.mockResolvedValue(MR_TEE_CHAT);
  });

  test("creates a chat for the chosen project and persona and opens it", async () => {
    await expect(
      start({ projectId: FOX_PROJECT.id, personaId: "mr-tee" }),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${MR_TEE_CHAT.id}`);

    expect(store.createChat).toHaveBeenCalledWith({
      projectId: FOX_PROJECT.id,
      personaId: "mr-tee",
    });
  });

  test("passes the project id on in lowercase", async () => {
    await expect(
      start({ projectId: FOX_PROJECT.id.toUpperCase(), personaId: "hippy" }),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${MR_TEE_CHAT.id}`);

    expect(store.createChat).toHaveBeenCalledWith({
      projectId: FOX_PROJECT.id,
      personaId: "hippy",
    });
  });

  test("asks for a persona when it is unknown or missing", async () => {
    expect(
      await start({ projectId: FOX_PROJECT.id, personaId: "coach" }),
    ).toEqual(CHOOSE_PERSONA);
    expect(await start({ projectId: FOX_PROJECT.id })).toEqual(CHOOSE_PERSONA);

    expect(store.createChat).not.toHaveBeenCalled();
  });

  test("asks for a project when it is missing or its id is not a UUID", async () => {
    expect(await start({ projectId: "", personaId: "hippy" })).toEqual(
      CHOOSE_PROJECT,
    );
    expect(await start({ projectId: "project-1", personaId: "hippy" })).toEqual(
      CHOOSE_PROJECT,
    );
    expect(await start({ personaId: "hippy" })).toEqual(CHOOSE_PROJECT);

    expect(store.createChat).not.toHaveBeenCalled();
  });

  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    store.createChat.mockRejectedValue(failure);

    await expect(
      start({ projectId: FOX_PROJECT.id, personaId: "hippy" }),
    ).rejects.toBe(failure);
  });
});
