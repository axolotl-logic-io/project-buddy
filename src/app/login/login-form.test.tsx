import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

vi.mock("./actions", () => ({
  login: vi.fn(async () => ({ error: "Wrong passphrase." })),
}));

describe("LoginForm", () => {
  it("asks for the passphrase in a password field", () => {
    render(<LoginForm />);

    const input = screen.getByLabelText("Passphrase");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("name", "passphrase");
    expect(input).toBeRequired();
    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument();
  });

  it("shows the error the login action returns", async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Passphrase"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wrong passphrase.",
    );
  });
});
