import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DONUT_PROJECT, FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { listProjects } from "@/projects/store.ts";
import NewChatPage from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

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
    signInAs(SIGNED_IN_USER);
    store.listProjects.mockResolvedValue([FOX_PROJECT, DONUT_PROJECT]);
  });

  test("preselects the project named in the search parameters", async () => {
    render(await pageFor(DONUT_PROJECT.id));

    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue(
      DONUT_PROJECT.id,
    );
    expect(store.listProjects).toHaveBeenCalledWith(SIGNED_IN_USER.id);
  });

  test("preselects the project named by its id in capitals", async () => {
    render(await pageFor(DONUT_PROJECT.id.toUpperCase()));

    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue(
      DONUT_PROJECT.id,
    );
  });

  test.each([
    ["a malformed project id", "donut"],
    ["an unknown project id", "00000000-0000-4000-8000-000000000000"],
  ])("preselects the first project for %s", async (_description, projectId) => {
    render(await pageFor(projectId));

    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue(
      FOX_PROJECT.id,
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
