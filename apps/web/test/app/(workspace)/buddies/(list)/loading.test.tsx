import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import BuddyListLoading from "@/app/(workspace)/buddies/(list)/loading.tsx";

describe("Buddy list loading", () => {
  test("says loading buddies… while the page streams in", () => {
    render(<BuddyListLoading />);

    expect(screen.getByText("Loading buddies…")).toBeInTheDocument();
  });
});
