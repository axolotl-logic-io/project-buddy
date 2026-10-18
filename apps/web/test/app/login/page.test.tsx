import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import LoginPage from "@/app/login/page.tsx";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

vi.mock("@/app/login/actions.ts", () => ({
  requestLoginLinkAction: vi.fn(),
}));

describe("Login page", () => {
  test("asks for her email address alone, and links to the sign-up page", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: SITE_COPY.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(LOGIN_COPY.intro)).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toEqual([
      screen.getByRole("textbox", { name: LOGIN_COPY.emailLabel }),
    ]);
    expect(screen.queryByLabelText("Invite code")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: LOGIN_COPY.send }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: LOGIN_COPY.signUpLink }),
    ).toHaveAttribute("href", "/signup");
  });

  test("leaves the main landmark to the root layout", () => {
    render(<LoginPage />);

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});
