import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";

describe("LoadingSkeleton", () => {
  test("tells screen readers what is loading, and hides its shapes", () => {
    const { container } = render(
      <LoadingSkeleton
        label="Loading projects…"
        shapes={["heading", "cards"]}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading projects…");
    const shapes = container.querySelectorAll("[aria-hidden=true]");
    expect(shapes).toHaveLength(2);
  });

  test("marks its region busy while it shows", () => {
    render(<LoadingSkeleton label="Loading chat…" shapes={["messages"]} />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});
