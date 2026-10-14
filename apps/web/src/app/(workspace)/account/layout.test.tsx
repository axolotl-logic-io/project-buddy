import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import AccountLayout from "./layout.tsx";

vi.mock("./actions.ts", () => ({
  signOutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
}));

describe("Account layout", () => {
  test("heads the page, and offers both ways to sign out below the usage", () => {
    render(
      <AccountLayout params={Promise.resolve({})}>
        <section aria-label="Usage" />
      </AccountLayout>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: ACCOUNT_COPY.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("region").map((region) => region.ariaLabel),
    ).toEqual(["Usage", null]);
    expect(
      screen.getByRole("region", { name: ACCOUNT_COPY.signOutHeading }),
    ).toContainElement(
      screen.getByRole("button", { name: ACCOUNT_COPY.signOut }),
    );
    expect(
      screen.getByRole("button", { name: ACCOUNT_COPY.signOutEverywhere }),
    ).toBeInTheDocument();
  });
});
