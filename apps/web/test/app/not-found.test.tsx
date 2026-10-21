import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import NotFound from "@/app/not-found.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

describe("use_case_open_missing_page", () => {
  test("says the project or chat can't be found, and links to the projects", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: PROBLEMS_COPY.notFoundHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(userMessage("not-found"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
  });
});
