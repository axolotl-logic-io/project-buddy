import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import type { listChats } from "@/chats/store.ts";
import type { getProject } from "@/projects/store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../../auth/current-user-test-kit.ts";
import { FOX_CHAT, FOX_PROJECT } from "../../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../../auth/current-user-test-kit.ts"),
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

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  projectStore.getProject.mockResolvedValue(FOX_PROJECT);
  chatStore.listChats.mockResolvedValue([FOX_CHAT]);
});

describe("use_case_open_project", () => {
  test("shows the project's name, a start-chat link and its chats", async () => {
    render(await pageFor(FOX_PROJECT.id));

    expect(
      screen.getByRole("heading", { level: 1, name: FOX_PROJECT.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: PROJECT_COPY.startChat }),
    ).toHaveAttribute("href", `/chats/new?projectId=${FOX_PROJECT.id}`);
    expect(
      screen.getByRole("link", { name: FOX_CHAT.buddy.name }),
    ).toHaveAttribute("href", `/chats/${FOX_CHAT.id}`);
    expect(projectStore.getProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
    expect(chatStore.listChats).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_PROJECT.id,
    );
    // Only the all-chats page opts into project badges, not this list.
    expect(screen.getAllByText(FOX_PROJECT.name)).toHaveLength(1);
    expect(screen.getByRole("listitem")).not.toHaveTextContent(
      FOX_PROJECT.name,
    );
  });

  test("says a project with no chats has none", async () => {
    chatStore.listChats.mockResolvedValue([]);

    render(await pageFor(FOX_PROJECT.id));

    expect(screen.getByText(PROJECT_COPY.noChats)).toBeInTheDocument();
  });

  test("links to the project's memory page", async () => {
    render(await pageFor(FOX_PROJECT.id));

    expect(
      screen.getByRole("link", { name: MEMORY_COPY.link }),
    ).toHaveAttribute("href", `/projects/${FOX_PROJECT.id}/memory`);
  });

  test("is not found for an unknown project", async () => {
    projectStore.getProject.mockResolvedValue(undefined);

    await expect(pageFor("missing")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("use_case_resume_interview", () => {
  test("links back to the project's interview chat", async () => {
    projectStore.getProject.mockResolvedValue({
      ...FOX_PROJECT,
      interviewChatId: FOX_CHAT.id,
    });

    render(await pageFor(FOX_PROJECT.id));

    expect(
      screen.getByRole("link", { name: PROJECT_COPY.interviewLink }),
    ).toHaveAttribute("href", `/chats/${FOX_CHAT.id}`);
  });

  test("has no interview link when the project has no interview chat", async () => {
    render(await pageFor(FOX_PROJECT.id));

    expect(
      screen.queryByRole("link", { name: PROJECT_COPY.interviewLink }),
    ).not.toBeInTheDocument();
  });
});
