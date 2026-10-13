import { render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "@/auth/current-user-test-kit.ts";
import {
  SignedInLinks,
  SignedInLinksLoading,
  SiteHeader,
} from "@/components/site-header.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
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
});

describe("SignedInLinks", () => {
  test("links to Settings and Account when she is signed in", async () => {
    signInAs(SIGNED_IN_USER);

    render(<SiteHeader links={await SignedInLinks()} />);

    expect(
      within(banner()).getByRole("link", { name: SETTINGS_COPY.headerLink }),
    ).toHaveAttribute("href", "/settings");
    expect(
      within(banner()).getByRole("link", { name: ACCOUNT_COPY.headerLink }),
    ).toHaveAttribute("href", "/account");
  });

  test("shows no links to a visitor", async () => {
    signOut();

    render(<SiteHeader links={await SignedInLinks()} />);

    expect(within(banner()).getAllByRole("link")).toHaveLength(1);
  });
});

describe("SignedInLinksLoading", () => {
  test("keeps the links' room, unseen and out of reach", () => {
    render(<SiteHeader links={<SignedInLinksLoading />} />);

    expect(within(banner()).getAllByRole("link")).toHaveLength(1);
    const kept = within(banner()).getByText(ACCOUNT_COPY.headerLink);
    expect(kept).toHaveClass("invisible");
    expect(kept).toHaveAttribute("aria-hidden", "true");
  });
});
