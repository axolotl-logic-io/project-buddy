import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ProjectListLayout from "@/app/(workspace)/projects/(list)/layout.tsx";
import ProjectListLoading from "@/app/(workspace)/projects/(list)/loading.tsx";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

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

    expect(
      screen.getByRole("link", { name: PROJECTS_COPY.homeLink }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("heading", { level: 1, name: "Projects" }),
    ).toBeInTheDocument();
  });

  // Issue #471: the site calls its projects list "Projects".
  test("heads the list Projects", () => {
    renderShell();

    expect(
      screen.getByRole("heading", { level: 2, name: "Projects" }),
    ).toBeInTheDocument();
  });

  test("offers the new-project form above the list", () => {
    renderShell();

    const name = screen.getByRole("textbox", { name: PROJECTS_COPY.nameLabel });
    expect(
      screen.getByRole("button", { name: PROJECTS_COPY.create }),
    ).toBeInTheDocument();
    expect(
      name.compareDocumentPosition(screen.getByText(PROJECTS_COPY.loading)),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe("use_case_new_project_with_buddy", () => {
  test("offers the built-in buddies without waiting for her own", () => {
    renderShell();

    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
  });
});
