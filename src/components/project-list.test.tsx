import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ProjectList } from "@/components/project-list.tsx";
import { projectIdFixture } from "@/id-fixtures.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const NO_PROJECTS_YET = /no projects yet/iu;
const FOX_ID = projectIdFixture();
const DONUT_ID = projectIdFixture();
// 20:16 on October 12 in New York (EDT), and already October 13 in UTC.
const EVENING_IN_NEW_YORK = new Date("2026-10-13T00:16:00Z");

afterEach(() => {
  vi.unstubAllEnvs();
});

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
    for (const card of screen.getAllByRole("listitem")) {
      expect(card).toHaveClass("link-card");
    }
  });

  test("gives each project's name a card title's look", () => {
    render(
      <ProjectList
        projects={[{ id: FOX_ID, name: "Low-poly fox", createdAt: new Date() }]}
      />,
    );

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveClass(
      "card-title",
    );
  });

  test("says when each project started, on the browser's day", () => {
    vi.stubEnv("TZ", "America/New_York");

    render(
      <ProjectList
        projects={[
          { id: FOX_ID, name: "Low-poly fox", createdAt: EVENING_IN_NEW_YORK },
        ]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      PROJECTS_COPY.created("Oct 12, 2026"),
    );
  });

  test("says so when there are no projects", () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText(NO_PROJECTS_YET)).toBeInTheDocument();
  });
});
