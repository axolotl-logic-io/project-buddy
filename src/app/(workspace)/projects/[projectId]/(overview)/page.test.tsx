import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_CHAT, FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { listChats } from "@/chats/store.ts";
import type { getProject } from "@/projects/store.ts";
import ProjectPage from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const projectStore = vi.hoisted(() => ({
  getProject: vi.fn<typeof getProject>(),
}));
vi.mock("@/projects/store.ts", () => projectStore);

const chatStore = vi.hoisted(() => ({ listChats: vi.fn<typeof listChats>() }));
vi.mock("@/chats/store.ts", () => chatStore);

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

function pageFor(projectId: string): ReturnType<typeof ProjectPage> {
  return ProjectPage({
    params: Promise.resolve({ projectId }),
    searchParams: Promise.resolve({}),
  });
}

describe("Project page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(SIGNED_IN_USER);
    projectStore.getProject.mockResolvedValue(FOX_PROJECT);
    chatStore.listChats.mockResolvedValue([FOX_CHAT]);
  });

  test("shows the project's name, a start-chat link and its chats", async () => {
    render(await pageFor(FOX_PROJECT.id));

    expect(
      screen.getByRole("heading", { level: 1, name: "Low-poly fox" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a chat" })).toHaveAttribute(
      "href",
      `/chats/new?projectId=${FOX_PROJECT.id}`,
    );
    expect(
      screen.getByRole("link", { name: FOX_CHAT.persona.name }),
    ).toBeInTheDocument();
    expect(projectStore.getProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
    expect(chatStore.listChats).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
  });

  test("is not found for an unknown project", async () => {
    projectStore.getProject.mockResolvedValue(undefined);

    await expect(pageFor("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalled();
  });
});
