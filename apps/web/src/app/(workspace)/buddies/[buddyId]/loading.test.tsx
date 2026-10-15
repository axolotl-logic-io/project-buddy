import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import BuddyLoading from "./loading.tsx";

describe("Buddy loading", () => {
  test("says loading buddy… while the page streams in", () => {
    render(<BuddyLoading />);

    expect(screen.getByText("Loading buddy…")).toBeInTheDocument();
  });
});
