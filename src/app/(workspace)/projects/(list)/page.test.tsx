import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DONUT_PROJECT, FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import type { listProjects } from "@/projects/store.ts";
import ProjectsPage from "./page.tsx";

const store = vi.hoisted(() => ({
  listProjects: vi.fn<typeof listProjects>(),
}));
vi.mock("@/projects/store.ts", () => store);

// connection() needs a request scope, which a unit test has none of.
vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

describe("Projects page", () => {
  test("links each stored project", async () => {
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
  });
});
