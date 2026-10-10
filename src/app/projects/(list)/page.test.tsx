import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ProjectsPage from "./page.tsx";

const store = vi.hoisted(() => ({ listProjects: vi.fn() }));
vi.mock("@/projects/store", () => store);

// connection() needs a request scope, which a unit test has none of.
vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

describe("Projects page", () => {
  test("links each stored project", async () => {
    store.listProjects.mockResolvedValue([
      { id: "p1", name: "Low-poly fox", createdAt: new Date() },
      { id: "p2", name: "Donut", createdAt: new Date() },
    ]);

    render(await ProjectsPage());

    expect(screen.getByRole("link", { name: "Low-poly fox" })).toHaveAttribute(
      "href",
      "/projects/p1",
    );
    expect(screen.getByRole("link", { name: "Donut" })).toHaveAttribute(
      "href",
      "/projects/p2",
    );
  });
});
