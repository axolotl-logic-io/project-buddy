import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import NewChatPage from "./page.tsx";

const store = vi.hoisted(() => ({ listProjects: vi.fn() }));
vi.mock("@/projects/store", () => store);

vi.mock("@/app/chats/actions", () => ({ startChatAction: vi.fn() }));

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
    store.listProjects.mockResolvedValue([
      { id: "p1", name: "Low-poly fox", createdAt: new Date() },
      { id: "p2", name: "Donut", createdAt: new Date() },
    ]);
  });

  test("preselects the project named in the search parameters", async () => {
    render(await pageFor("p2"));

    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue("p2");
  });

  test("ignores a repeated project parameter", async () => {
    render(await pageFor(["p2", "p2"]));

    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue("p1");
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
