import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "@/app/page.tsx";

const TAGLINE = /learn blender.*your own projects/iu;
const PROJECTS = /projects/iu;

describe("Home page", () => {
  test("shows the Project Buddy heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Project Buddy" }),
    ).toBeInTheDocument();
  });

  test("shows a tagline about learning Blender through your own projects", () => {
    render(<Home />);

    expect(screen.getByText(TAGLINE)).toBeInTheDocument();
  });

  test("links to the projects page", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: PROJECTS })).toHaveAttribute(
      "href",
      "/projects",
    );
  });
});
