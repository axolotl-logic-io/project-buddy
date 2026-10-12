import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import LoginPage from "./page.tsx";

describe("Login page", () => {
  test("says that sign-in is by email link, with no passphrase form", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: SITE_COPY.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(LOGIN_COPY.intro)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("leaves the main landmark to the root layout", () => {
    render(<LoginPage />);

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});
