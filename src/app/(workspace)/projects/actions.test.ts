import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT, MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import type {
  Chat,
  createChat,
  NewMessage,
  saveMessage,
} from "@/chats/store.ts";
import { AppError } from "@/errors/app-error.ts";
import { messageIdFixture } from "@/id-fixtures.ts";
import type { createProject } from "@/projects/store.ts";
import type { writeInterviewOpening } from "@/tutor/interview-opening.ts";
import { COPY } from "@/ui/copy.ts";

const projectStore = vi.hoisted(() => ({
  createProject: vi.fn<typeof createProject>(),
}));
vi.mock("@/projects/store.ts", () => projectStore);

const chatStore = vi.hoisted(() => ({
  createChat: vi.fn<typeof createChat>(),
  saveMessage: vi.fn<typeof saveMessage>(),
}));
vi.mock("@/chats/store.ts", () => chatStore);

const interview = vi.hoisted(() => ({
  writeInterviewOpening: vi.fn<typeof writeInterviewOpening>(),
}));
vi.mock("@/tutor/interview-opening.ts", () => interview);

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
const NEEDS_PERSONA: CreateProjectState = {
  kind: "invalid",
  message: COPY.interview.choosePersona,
};

// The interview chat as the chats store creates it.
const INTERVIEW_CHAT: Chat = {
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
  parts: [{ type: "text", text: "What are we building?" }],
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
  chatStore.createChat.mockResolvedValue(INTERVIEW_CHAT);
  chatStore.saveMessage.mockResolvedValue();
  interview.writeInterviewOpening.mockResolvedValue(OPENING);
});

describe("createProjectAction creating", () => {
  test("creates the project with a trimmed name and its interview chat", async () => {
    await expect(
      createProjectAction(
        IDLE,
        form({ name: "  Low-poly fox  ", personaId: "mr-tee" }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${INTERVIEW_CHAT.id}`);

    expect(projectStore.createProject).toHaveBeenCalledWith("Low-poly fox");
    expect(chatStore.createChat).toHaveBeenCalledWith({
      projectId: FOX_PROJECT.id,
      personaId: "mr-tee",
    });
  });

  test("saves the tutor's opening question in the chat before opening it", async () => {
    await expect(
      createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", personaId: "mr-tee" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(interview.writeInterviewOpening).toHaveBeenCalledWith({
      ...INTERVIEW_CHAT,
      projectName: FOX_PROJECT.name,
    });
    expect(chatStore.saveMessage).toHaveBeenCalledWith(
      INTERVIEW_CHAT.id,
      OPENING,
    );
    const [saved] = chatStore.saveMessage.mock.invocationCallOrder;
    const [redirected] = navigation.redirect.mock.invocationCallOrder;
    expect(saved).toBeLessThan(redirected ?? 0);
  });
});

describe("createProjectAction refusing", () => {
  test("asks for a name when it is blank", async () => {
    expect(
      await createProjectAction(
        IDLE,
        form({ name: "   ", personaId: "hippy" }),
      ),
    ).toEqual(NEEDS_NAME);

    expect(projectStore.createProject).not.toHaveBeenCalled();
    expect(chatStore.createChat).not.toHaveBeenCalled();
  });

  test("asks for a name when the form has none, or a file for it", async () => {
    const withFile = form({ personaId: "hippy" });
    withFile.set("name", new File(["fox"], "fox.txt"));

    expect(await createProjectAction(IDLE, form({}))).toEqual(NEEDS_NAME);
    expect(await createProjectAction(IDLE, withFile)).toEqual(NEEDS_NAME);

    expect(projectStore.createProject).not.toHaveBeenCalled();
    expect(chatStore.createChat).not.toHaveBeenCalled();
  });

  test("asks for a persona when it is missing or unknown", async () => {
    expect(
      await createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).toEqual(NEEDS_PERSONA);
    expect(
      await createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", personaId: "darth-vader" }),
      ),
    ).toEqual(NEEDS_PERSONA);

    expect(projectStore.createProject).not.toHaveBeenCalled();
    expect(chatStore.createChat).not.toHaveBeenCalled();
  });
});

describe("createProjectAction failing", () => {
  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    projectStore.createProject.mockRejectedValue(failure);

    await expect(
      createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", personaId: "hippy" }),
      ),
    ).rejects.toBe(failure);
    expect(chatStore.createChat).not.toHaveBeenCalled();
  });

  test("throws a failure to save the chat on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    chatStore.saveMessage.mockRejectedValue(failure);

    await expect(
      createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", personaId: "hippy" }),
      ),
    ).rejects.toBe(failure);
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
