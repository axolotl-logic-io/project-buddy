import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ProjectListLoading from "./loading.tsx";

describe("Project list loading", () => {
  test("says loading projects… while the page streams in", () => {
    render(<ProjectListLoading />);

    expect(screen.getByText("Loading projects…")).toBeInTheDocument();
  });
});
