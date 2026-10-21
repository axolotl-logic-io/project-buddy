import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ProjectList } from "@/components/project-list.tsx";
import type { ProjectId } from "@/ids.ts";
import type { Project } from "@/projects/store.ts";
import { projectIdFixture } from "../id-fixtures.ts";

const NO_PROJECTS_YET = /no projects yet/iu;
const FOX_ID = projectIdFixture();
const DONUT_ID = projectIdFixture();

// A project as the project store reads it, with no interview chat.
function project(id: ProjectId, name: string, createdAt = new Date()): Project {
  return { id, name, interviewChatId: undefined, createdAt };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("use_case_view_projects", () => {
  test("links each project to its page", () => {
    render(
      <ProjectList
        projects={[project(FOX_ID, "Low-poly fox"), project(DONUT_ID, "Donut")]}
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
