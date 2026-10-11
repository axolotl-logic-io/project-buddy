import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ProjectLayout from "./layout.tsx";
import ProjectLoading from "./loading.tsx";

describe("Project layout", () => {
  test("links back to all projects above the project", () => {
    render(
      <ProjectLayout params={Promise.resolve({ projectId: "project-1" })}>
        <ProjectLoading />
      </ProjectLayout>,
    );

    const allProjects = screen.getByRole("link", { name: "All projects" });
    expect(allProjects).toHaveAttribute("href", "/projects");
    expect(
      allProjects.compareDocumentPosition(screen.getByText("Loading project…")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
