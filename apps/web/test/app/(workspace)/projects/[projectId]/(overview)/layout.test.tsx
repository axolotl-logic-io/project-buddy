import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectLoading from "@/app/(workspace)/projects/[projectId]/(overview)/loading.tsx";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";

describe("Project layout", () => {
  test("links back to all projects above the project", () => {
    render(
      <ProjectLayout params={Promise.resolve({ projectId: "project-1" })}>
        <ProjectLoading />
      </ProjectLayout>,
    );

    const allProjects = screen.getByRole("link", {
      name: PROJECTS_COPY.allProjectsLink,
    });
    expect(allProjects).toHaveAttribute("href", "/projects");
    expect(
      allProjects.compareDocumentPosition(
        screen.getByText(PROJECT_COPY.loading),
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
