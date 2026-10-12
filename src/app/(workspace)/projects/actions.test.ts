import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT, MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import type { startChat } from "@/chats/start-chat.ts";
import { AppError } from "@/errors/app-error.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import type { createProject } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const projectStore = vi.hoisted(() => ({
  createProject: vi.fn<typeof createProject>(),
}));
vi.mock("@/projects/store.ts", () => projectStore);

const chats = vi.hoisted(() => ({ startChat: vi.fn<typeof startChat>() }));
vi.mock("@/chats/start-chat.ts", () => chats);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

const IDLE: CreateProjectState = { kind: "idle" };
const NEEDS_NAME: CreateProjectState = {
  kind: "invalid",
  message: COPY.projects.needsName,
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  projectStore.createProject.mockResolvedValue(FOX_PROJECT);
  chats.startChat.mockResolvedValue(MR_TEE_CHAT);
});

describe("createProjectAction creating", () => {
  test("creates the project with a trimmed name, then its first chat with the default persona", async () => {
    await expect(
      createProjectAction(IDLE, form({ name: "  Low-poly fox  " })),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${MR_TEE_CHAT.id}`);

    expect(projectStore.createProject).toHaveBeenCalledWith("Low-poly fox");
    expect(chats.startChat).toHaveBeenCalledWith(
      FOX_PROJECT,
      DEFAULT_PERSONA_ID,
    );
    const [started] = chats.startChat.mock.invocationCallOrder;
    const [redirected] = navigation.redirect.mock.invocationCallOrder;
    expect(started).toBeLessThan(redirected ?? 0);
  });

  test("ignores a persona the form sends", async () => {
    await expect(
      createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", personaId: "mr-tee" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(chats.startChat).toHaveBeenCalledWith(
      FOX_PROJECT,
      DEFAULT_PERSONA_ID,
    );
  });
});

describe("createProjectAction refusing", () => {
  test("asks for a name when it is blank", async () => {
    expect(await createProjectAction(IDLE, form({ name: "   " }))).toEqual(
      NEEDS_NAME,
    );

    expect(projectStore.createProject).not.toHaveBeenCalled();
    expect(chats.startChat).not.toHaveBeenCalled();
  });

  test("asks for a name when the form has none, or a file for it", async () => {
    const withFile = new FormData();
    withFile.set("name", new File(["fox"], "fox.txt"));

    expect(await createProjectAction(IDLE, form({}))).toEqual(NEEDS_NAME);
    expect(await createProjectAction(IDLE, withFile)).toEqual(NEEDS_NAME);

    expect(projectStore.createProject).not.toHaveBeenCalled();
    expect(chats.startChat).not.toHaveBeenCalled();
  });
});

describe("createProjectAction failing", () => {
  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    projectStore.createProject.mockRejectedValue(failure);

    await expect(
      createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).rejects.toBe(failure);
    expect(chats.startChat).not.toHaveBeenCalled();
  });

  test("throws a failure to start the chat on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    chats.startChat.mockRejectedValue(failure);

    await expect(
      createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).rejects.toBe(failure);
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
