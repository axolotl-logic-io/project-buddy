import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import MemoryLoading from "@/app/(workspace)/projects/[projectId]/memory/loading.tsx";

describe("Memory loading", () => {
  test("says loading memory… while the page streams in", () => {
    render(<MemoryLoading />);

    expect(screen.getByText("Loading memory…")).toBeInTheDocument();
  });
});
