import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DONUT_PROJECT, FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import type { listProjects } from "@/projects/store.ts";
import NewChatPage from "./page.tsx";

const store = vi.hoisted(() => ({
  listProjects: vi.fn<typeof listProjects>(),
}));
vi.mock("@/projects/store.ts", () => store);

vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(),
}));

const CREATE_A_PROJECT_FIRST = /^create a/iu;

function pageFor(
  projectId: string | string[] | undefined,
): ReturnType<typeof NewChatPage> {
  return NewChatPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({ projectId }),
  });
}

describe("New chat page", () => {
  beforeEach(() => {
    store.listProjects.mockResolvedValue([FOX_PROJECT, DONUT_PROJECT]);
  });

  test("preselects the project named in the search parameters", async () => {
    render(await pageFor(DONUT_PROJECT.id));

    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue(
      DONUT_PROJECT.id,
    );
  });

  test("ignores a repeated project parameter", async () => {
    render(await pageFor([DONUT_PROJECT.id, DONUT_PROJECT.id]));

    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue(
      FOX_PROJECT.id,
    );
  });

  test("asks for a project first when there are none", async () => {
    store.listProjects.mockResolvedValue([]);

    render(await pageFor(undefined));

    expect(screen.getByRole("link", { name: "project" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByText(CREATE_A_PROJECT_FIRST)).toHaveTextContent(
      "Create a project first.",
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
