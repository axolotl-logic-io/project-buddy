import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "@/app/page.tsx";
import { HOME_COPY } from "@/ui/copy/site.ts";

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

  test("links to the central chat beside the projects link", () => {
    render(<Home />);

    const chat = screen.getByRole("link", { name: HOME_COPY.chatLink });
    expect(chat).toHaveAttribute("href", "/chat");
    const projects = screen.getByRole("link", { name: HOME_COPY.projectsLink });
    expect(chat.parentElement).toBe(projects.parentElement);
  });

  test("leaves the main landmark to the root layout", () => {
    render(<Home />);

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});
