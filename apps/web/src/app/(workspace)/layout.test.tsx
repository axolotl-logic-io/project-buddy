import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import WorkspaceLayout from "./layout.tsx";

describe("Workspace layout", () => {
  test("renders the page and leaves the main landmark to the root layout", () => {
    render(
      <WorkspaceLayout header={null} params={Promise.resolve({})}>
        <section aria-label="Page" />
      </WorkspaceLayout>,
    );

    expect(screen.getByRole("region", { name: "Page" })).toBeInTheDocument();
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});
