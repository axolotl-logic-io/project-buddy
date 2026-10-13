import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import { FOX_CHAT, FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { startChat } from "@/chats/start-chat.ts";
import { AppError } from "@/errors/app-error.ts";
import type { getProject } from "@/projects/store.ts";
import {
  NEW_CHAT_COPY,
  OPENING_COPY,
  quotaUsedUpMessage,
} from "@/ui/copy/chat.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const chats = vi.hoisted(() => ({ startChat: vi.fn<typeof startChat>() }));
vi.mock("@/chats/start-chat.ts", () => chats);

const projectStore = vi.hoisted(() => ({
  getProject: vi.fn<typeof getProject>(),
}));
vi.mock("@/projects/store.ts", () => projectStore);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

const IDLE: StartChatState = { kind: "idle" };
const CHOOSE_PERSONA: StartChatState = {
  kind: "invalid",
  message: NEW_CHAT_COPY.choosePersona,
};
const CHOOSE_PROJECT: StartChatState = {
  kind: "invalid",
  message: NEW_CHAT_COPY.chooseProject,
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

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  projectStore.getProject.mockResolvedValue(FOX_PROJECT);
  chats.startChat.mockResolvedValue({ kind: "started", chat: FOX_CHAT });
});

describe("startChatAction starting", () => {
  test("starts a chat in the chosen project with the chosen persona and opens it", async () => {
    await expect(
      start({ projectId: FOX_PROJECT.id, personaId: "mr-tee" }),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${FOX_CHAT.id}`);

    expect(projectStore.getProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
    expect(chats.startChat).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT,
      "mr-tee",
    );
    const [started] = chats.startChat.mock.invocationCallOrder;
    const [redirected] = navigation.redirect.mock.invocationCallOrder;
    expect(started).toBeLessThan(redirected ?? 0);
  });

  test("passes the project id on in lowercase", async () => {
    await expect(
      start({ projectId: FOX_PROJECT.id.toUpperCase(), personaId: "hippy" }),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${FOX_CHAT.id}`);

    expect(projectStore.getProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
    expect(chats.startChat).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT,
      "hippy",
    );
  });
});

describe("startChatAction refusing", () => {
  test("asks for a persona when it is unknown or missing", async () => {
    expect(
      await start({ projectId: FOX_PROJECT.id, personaId: "coach" }),
    ).toEqual(CHOOSE_PERSONA);
    expect(await start({ projectId: FOX_PROJECT.id })).toEqual(CHOOSE_PERSONA);

    expect(chats.startChat).not.toHaveBeenCalled();
  });

  test("asks for a project when it is missing or its id is not a UUID", async () => {
    expect(await start({ projectId: "", personaId: "hippy" })).toEqual(
      CHOOSE_PROJECT,
    );
    expect(await start({ projectId: "project-1", personaId: "hippy" })).toEqual(
      CHOOSE_PROJECT,
    );
    expect(await start({ personaId: "hippy" })).toEqual(CHOOSE_PROJECT);

    expect(chats.startChat).not.toHaveBeenCalled();
  });

  test("asks for a project when no project has its id", async () => {
    projectStore.getProject.mockResolvedValue(undefined);

    expect(
      await start({ projectId: FOX_PROJECT.id, personaId: "hippy" }),
    ).toEqual(CHOOSE_PROJECT);
    expect(chats.startChat).not.toHaveBeenCalled();
  });
});

describe("startChatAction without Claude", () => {
  test("says Claude is unavailable, keeping her choices, when Claude can't open the chat", async () => {
    chats.startChat.mockResolvedValue({ kind: "claudeUnavailable" });

    expect(
      await start({ projectId: FOX_PROJECT.id, personaId: "mr-tee" }),
    ).toEqual({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      projectId: FOX_PROJECT.id,
      personaId: "mr-tee",
    });
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});

describe("startChatAction once her quota is used up", () => {
  test("says so and when it resets, starting nothing", async () => {
    const resetsOn = new Date("2026-11-01T00:00:00Z");
    chats.startChat.mockResolvedValue({ kind: "quotaUsedUp", resetsOn });

    expect(
      await start({ projectId: FOX_PROJECT.id, personaId: "mr-tee" }),
    ).toEqual({ kind: "quotaUsedUp", message: quotaUsedUpMessage(resetsOn) });
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});

describe("startChatAction failing", () => {
  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    chats.startChat.mockRejectedValue(failure);

    await expect(
      start({ projectId: FOX_PROJECT.id, personaId: "hippy" }),
    ).rejects.toBe(failure);
  });
});
