import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ProjectList } from "@/components/project-list.tsx";
import { projectIdFixture } from "@/id-fixtures.ts";

const NO_PROJECTS_YET = /no projects yet/iu;
const FOX_ID = projectIdFixture();
const DONUT_ID = projectIdFixture();

describe("ProjectList", () => {
  test("links each project to its page", () => {
    render(
      <ProjectList
        projects={[
          { id: FOX_ID, name: "Low-poly fox", createdAt: new Date() },
          { id: DONUT_ID, name: "Donut", createdAt: new Date() },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveAttribute(
      "href",
      `/projects/${FOX_ID}`,
    );
    expect(screen.getByRole("link", { name: "Donut" })).toHaveAttribute(
      "href",
      `/projects/${DONUT_ID}`,
    );
  });

  test("says so when there are no projects", () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText(NO_PROJECTS_YET)).toBeInTheDocument();
  });
});
