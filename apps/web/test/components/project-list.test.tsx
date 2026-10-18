import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ProjectList } from "@/components/project-list.tsx";
import type { ProjectId } from "@/ids.ts";
import type { Project } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { projectIdFixture } from "../id-fixtures.ts";

const NO_PROJECTS_YET = /no projects yet/iu;
const FOX_ID = projectIdFixture();
const DONUT_ID = projectIdFixture();
// 20:16 on October 12 in New York (EDT), and already October 13 in UTC.
const EVENING_IN_NEW_YORK = new Date("2026-10-13T00:16:00Z");

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
    for (const card of screen.getAllByRole("listitem")) {
      expect(card).toHaveClass("link-card");
    }
  });

  test("says so when there are no projects", () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText(NO_PROJECTS_YET)).toBeInTheDocument();
  });
});

describe("ProjectList", () => {
  test("gives each project's name a card title's look", () => {
    render(<ProjectList projects={[project(FOX_ID, "Low-poly fox")]} />);

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveClass(
      "card-title",
    );
  });

  test("says when each project started, on the browser's day", () => {
    vi.stubEnv("TZ", "America/New_York");

    render(
      <ProjectList
        projects={[project(FOX_ID, "Low-poly fox", EVENING_IN_NEW_YORK)]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      PROJECTS_COPY.created("Oct 12, 2026"),
    );
  });
});
