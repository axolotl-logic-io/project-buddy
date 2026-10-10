import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ProjectList } from "@/components/project-list.tsx";

const NO_PROJECTS_YET = /no projects yet/iu;

describe("ProjectList", () => {
  test("links each project to its page", () => {
    render(
      <ProjectList
        projects={[
          { id: "p1", name: "Low-poly fox", createdAt: new Date() },
          { id: "p2", name: "Donut", createdAt: new Date() },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveAttribute(
      "href",
      "/projects/p1",
    );
    expect(screen.getByRole("link", { name: "Donut" })).toHaveAttribute(
      "href",
      "/projects/p2",
    );
  });

  test("says so when there are no projects", () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText(NO_PROJECTS_YET)).toBeInTheDocument();
  });
});
