import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import LoginPage from "./page.tsx";

vi.mock("./actions", () => ({ login: vi.fn() }));

describe("Login page", () => {
  test("shows a heading and the passphrase form", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Project Buddy" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Passphrase")).toBeInTheDocument();
  });
});
