import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import PersonaListLoading from "./loading.tsx";

describe("Persona list loading", () => {
  test("says loading personas… while the page streams in", () => {
    render(<PersonaListLoading />);

    expect(screen.getByText("Loading personas…")).toBeInTheDocument();
  });
});
