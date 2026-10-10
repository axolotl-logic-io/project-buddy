import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

vi.mock("./actions", () => ({ login: vi.fn() }));

describe("Login page", () => {
  it("shows a heading and the passphrase form", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Project Buddy" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Passphrase")).toBeInTheDocument();
  });
});
