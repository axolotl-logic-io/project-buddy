import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "@/app/page.tsx";

describe("Home page", () => {
  test("shows the Project Buddy heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Project Buddy" }),
    ).toBeInTheDocument();
  });

  test("shows a tagline about learning Blender through your own projects", () => {
    render(<Home />);

    expect(
      screen.getByText(/learn blender.*your own projects/iu),
    ).toBeInTheDocument();
  });

  test("links to the projects page", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: /projects/iu })).toHaveAttribute(
      "href",
      "/projects",
    );
  });
});
