import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DONUT_PROJECT, FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { listProjects } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import ProjectsPage from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  listProjects: vi.fn<typeof listProjects>(),
}));
vi.mock("@/projects/store.ts", () => store);

describe("use_case_view_projects", () => {
  test("links each of her projects, in the store's order", async () => {
    signInAs(SIGNED_IN_USER);
    store.listProjects.mockResolvedValue([FOX_PROJECT, DONUT_PROJECT]);

    render(await ProjectsPage());

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveAttribute(
      "href",
      `/projects/${FOX_PROJECT.id}`,
    );
    expect(screen.getByRole("link", { name: "Donut" })).toHaveAttribute(
      "href",
      `/projects/${DONUT_PROJECT.id}`,
    );
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(
      [FOX_PROJECT.name, DONUT_PROJECT.name],
    );
    expect(store.listProjects).toHaveBeenCalledWith(SIGNED_IN_USER.id);
  });

  test("says she has none yet", async () => {
    signInAs(SIGNED_IN_USER);
    store.listProjects.mockResolvedValue([]);

    render(await ProjectsPage());

    expect(screen.getByText(PROJECTS_COPY.none)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
