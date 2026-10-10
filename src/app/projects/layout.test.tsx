import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ProjectsLayout from "./layout.tsx";

describe("Projects layout", () => {
  test("puts the page inside the main landmark", () => {
    render(
      <ProjectsLayout params={Promise.resolve({})}>
        <section aria-label="Page" />
      </ProjectsLayout>,
    );

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("region", { name: "Page" }),
    );
  });
});
