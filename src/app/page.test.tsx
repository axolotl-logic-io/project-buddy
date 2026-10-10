import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("shows the Project Buddy heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Project Buddy" }),
    ).toBeInTheDocument();
  });

  it("shows a tagline about learning Blender through your own projects", () => {
    render(<Home />);

    expect(
      screen.getByText(/learn blender.*your own projects/i),
    ).toBeInTheDocument();
  });

  it("links to the projects page", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: /projects/i })).toHaveAttribute(
      "href",
      "/projects",
    );
  });
});
