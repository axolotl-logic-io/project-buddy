import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import NewChatLoading from "./loading.tsx";

describe("New chat loading", () => {
  test("says loading projects… while the page streams in", () => {
    render(<NewChatLoading />);

    expect(screen.getByText("Loading projects…")).toBeInTheDocument();
  });
});
