import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectList } from "@/components/project-list";

describe("ProjectList", () => {
  it("links each project to its page", () => {
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

  it("says so when there are no projects", () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });
});
