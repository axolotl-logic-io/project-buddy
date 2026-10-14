import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import PersonaLoading from "./loading.tsx";

describe("Persona loading", () => {
  test("says loading persona… while the page streams in", () => {
    render(<PersonaLoading />);

    expect(screen.getByText("Loading persona…")).toBeInTheDocument();
  });
});
