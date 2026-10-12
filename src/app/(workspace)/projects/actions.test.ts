import { beforeEach, describe, expect, test, vi } from "vitest";
import { MR_TEE_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { startProject } from "@/chats/start-chat.ts";
import { AppError } from "@/errors/app-error.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const chats = vi.hoisted(() => ({
  startProject: vi.fn<typeof startProject>(),
}));
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
  message: PROJECTS_COPY.needsName,
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
  signInAs(SIGNED_IN_USER);
  chats.startProject.mockResolvedValue({ kind: "started", chat: MR_TEE_CHAT });
});

describe("createProjectAction creating", () => {
  test("starts the project with a trimmed name, then opens its first chat", async () => {
    await expect(
      createProjectAction(IDLE, form({ name: "  Low-poly fox  " })),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${MR_TEE_CHAT.id}`);

    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
    );
    const [started] = chats.startProject.mock.invocationCallOrder;
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

    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
    );
  });
});

describe("createProjectAction refusing", () => {
  test("asks for a name when it is blank", async () => {
    expect(await createProjectAction(IDLE, form({ name: "   " }))).toEqual(
      NEEDS_NAME,
    );

    expect(chats.startProject).not.toHaveBeenCalled();
  });

  test("asks for a name when the form has none, or a file for it", async () => {
    const withFile = new FormData();
    withFile.set("name", new File(["fox"], "fox.txt"));

    expect(await createProjectAction(IDLE, form({}))).toEqual(NEEDS_NAME);
    expect(await createProjectAction(IDLE, withFile)).toEqual(NEEDS_NAME);

    expect(chats.startProject).not.toHaveBeenCalled();
  });

  test("says Claude is unavailable, keeping the name she typed, when Claude can't open the chat", async () => {
    chats.startProject.mockResolvedValue({ kind: "claudeUnavailable" });

    expect(
      await createProjectAction(IDLE, form({ name: " Low-poly fox " })),
    ).toEqual({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: "Low-poly fox",
    });
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});

describe("createProjectAction failing", () => {
  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    chats.startProject.mockRejectedValue(failure);

    await expect(
      createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).rejects.toBe(failure);
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
