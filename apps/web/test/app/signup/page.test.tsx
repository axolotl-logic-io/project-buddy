import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import SignUpPage from "@/app/signup/page.tsx";
import { SIGN_IN_PATH } from "@/routes.ts";
import { SIGNUP_COPY } from "@/ui/copy/signup.ts";

describe("Sign-up page", () => {
  test("requires an admin invitation, offers sign-in, and has no sign-up form", () => {
    render(<SignUpPage />);

    expect(screen.getByText(SIGNUP_COPY.intro)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: SIGNUP_COPY.signInLink }),
    ).toHaveAttribute("href", SIGN_IN_PATH);
  });
});
