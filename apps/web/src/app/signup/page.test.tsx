import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";
import SignUpPage from "./page.tsx";

vi.mock("@/app/signup/actions.ts", () => ({ signUpAction: vi.fn() }));

describe("Sign-up page", () => {
  test("asks for the invite code and her email address, and links to the sign-in page", () => {
    render(<SignUpPage />);

    expect(screen.getByText(SIGNUP_COPY.intro)).toBeInTheDocument();
    expect(screen.getByLabelText(SIGNUP_COPY.inviteCodeLabel)).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("textbox", { name: SIGNUP_COPY.emailLabel }),
    ).toHaveAttribute("type", "email");
    expect(
      screen.getByRole("button", { name: SIGNUP_COPY.send }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: SIGNUP_COPY.signInLink }),
    ).toHaveAttribute("href", "/login");
  });
});
