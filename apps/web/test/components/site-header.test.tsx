import { render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SignedInLinks, SiteHeader } from "@/components/site-header.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
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
  test("links the site's name home, in the header title's look", () => {
    render(<SiteHeader />);

    const name = within(banner()).getByRole("link", { name: SITE_COPY.name });
    expect(name).toHaveAttribute("href", "/");
    expect(name).toHaveClass("header-title");
  });

  test("offers the theme picker, after the links it is given", () => {
    render(<SiteHeader links={<a href="/somewhere">{SOMEWHERE}</a>} />);

    const controls = [...banner().querySelectorAll("a, button")].map(
      (control) => control.textContent,
    );
    expect(controls).toEqual([SITE_COPY.name, SOMEWHERE, THEME_COPY.picker]);
  });

  test("keeps the theme picker's name when it shows only its icon", () => {
    render(<SiteHeader />);

    const picker = within(banner()).getByRole("button", {
      name: THEME_COPY.picker,
    });
    expect(within(picker).getByText(THEME_COPY.picker)).toHaveClass(
      "sr-only",
      "sm:not-sr-only",
    );
  });
});

describe("SignedInLinks", () => {
  test("links to Chat, Projects, Buddies, Settings and Account when she is signed in", async () => {
    signInAs(SIGNED_IN_USER);

    render(<SiteHeader links={await SignedInLinks()} />);

    const links = within(banner())
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]);
    expect(links).toEqual([
      [SITE_COPY.name, "/"],
      [CHAT_COPY.headerLink, "/chat"],
      [PROJECTS_COPY.headerLink, "/projects"],
      [BUDDIES_COPY.headerLink, "/buddies"],
      [SETTINGS_COPY.headerLink, "/settings"],
      [ACCOUNT_COPY.headerLink, "/account"],
    ]);
  });

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
