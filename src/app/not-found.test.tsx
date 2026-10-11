import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import NotFound from "@/app/not-found.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

describe("NotFound", () => {
  test("says the project or chat can't be found, and links to the projects", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: COPY.problems.notFoundHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(userMessage("not-found"))).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: COPY.problems.projectsLink }),
    ).toHaveAttribute("href", "/projects");
  });
});
