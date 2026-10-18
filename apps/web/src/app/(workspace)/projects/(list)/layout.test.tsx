import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ProjectListLayout from "./layout.tsx";
import ProjectListLoading from "./loading.tsx";

vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  createProjectAction: vi.fn(),
}));

// Her own buddies, which the shell does not wait for.
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: vi.fn(() => new Promise(() => undefined)),
}));

// The shell Next prerenders: this layout around the loading fallback.
function renderShell(): void {
  render(
    <ProjectListLayout params={Promise.resolve({})}>
      <ProjectListLoading />
    </ProjectListLayout>,
  );
}

describe("use_case_view_projects", () => {
  test("links home and shows the Projects heading", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Projects" }),
    ).toBeInTheDocument();
  });

  test("offers the new-project form above the list", () => {
    renderShell();

    const name = screen.getByRole("textbox", { name: "Project name" });
    expect(name).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Create project" }),
    ).toBeInTheDocument();
    expect(
      name.compareDocumentPosition(screen.getByText("Loading projects…")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe("use_case_new_project_with_buddy", () => {
  test("offers the built-in buddies without waiting for her own", () => {
    renderShell();

    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
  });
});
