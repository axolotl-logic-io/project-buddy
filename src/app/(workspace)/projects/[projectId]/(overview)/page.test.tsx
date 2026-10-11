import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ProjectPage from "./page.tsx";

const projectStore = vi.hoisted(() => ({ getProject: vi.fn() }));
vi.mock("@/projects/store", () => projectStore);

const chatStore = vi.hoisted(() => ({ listChats: vi.fn() }));
vi.mock("@/chats/store", () => chatStore);

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
    projectStore.getProject.mockResolvedValue({
      id: "project-1",
      name: "Low-poly fox",
      createdAt: new Date(),
    });
    chatStore.listChats.mockResolvedValue([
      {
        id: "c1",
        projectId: "project-1",
        personaId: "mr-t",
        createdAt: new Date(),
      },
    ]);
  });

  test("shows the project's name, a start-chat link and its chats", async () => {
    render(await pageFor("project-1"));

    expect(
      screen.getByRole("heading", { level: 1, name: "Low-poly fox" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a chat" })).toHaveAttribute(
      "href",
      "/chats/new?projectId=project-1",
    );
    expect(screen.getByRole("link", { name: "Mr. T" })).toBeInTheDocument();
    expect(chatStore.listChats).toHaveBeenCalledWith("project-1");
  });

  test("is not found for an unknown project", async () => {
    projectStore.getProject.mockResolvedValue(undefined);

    await expect(pageFor("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalled();
  });
});
