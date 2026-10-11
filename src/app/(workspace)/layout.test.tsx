import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import WorkspaceLayout from "./layout.tsx";

describe("Workspace layout", () => {
  test("puts the page inside the main landmark", () => {
    render(
      <WorkspaceLayout params={Promise.resolve({})}>
        <section aria-label="Page" />
      </WorkspaceLayout>,
    );

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("region", { name: "Page" }),
    );
  });
});
