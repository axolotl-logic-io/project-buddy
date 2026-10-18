import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ProjectLoading from "@/app/(workspace)/projects/[projectId]/(overview)/loading.tsx";

describe("Project loading", () => {
  test("says loading project… while the page streams in", () => {
    render(<ProjectLoading />);

    expect(screen.getByText("Loading project…")).toBeInTheDocument();
  });
});
