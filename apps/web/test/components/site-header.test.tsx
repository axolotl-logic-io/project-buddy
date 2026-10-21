import { render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SignedInLinks, SiteHeader } from "@/components/site-header.tsx";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

const SOMEWHERE = "Somewhere";

function banner(): HTMLElement {
  return screen.getByRole("banner");
}

describe("SiteHeader", () => {
  test("offers the theme picker, after the links it is given", () => {
    render(<SiteHeader links={<a href="/somewhere">{SOMEWHERE}</a>} />);

    const controls = [...banner().querySelectorAll("a, button")].map(
      (control) => control.textContent,
    );
    expect(controls).toEqual([SITE_COPY.name, SOMEWHERE, THEME_COPY.picker]);
  });
});

describe("SignedInLinks", () => {
  // Issue #471: the site calls its two lists "Projects" and "Chats".
  test("names the two lists' links Chats and Projects", async () => {
    signInAs(SIGNED_IN_USER);

    render(<SiteHeader links={await SignedInLinks()} />);

    expect(
      within(banner()).getByRole("link", { name: "Chats" }),
    ).toHaveAttribute("href", "/chat");
    expect(
      within(banner()).getByRole("link", { name: "Projects" }),
    ).toHaveAttribute("href", "/projects");
  });

  test("shows no links to a visitor", async () => {
    signOut();

    render(<SiteHeader links={await SignedInLinks()} />);

    expect(within(banner()).getAllByRole("link")).toHaveLength(1);
  });
});
