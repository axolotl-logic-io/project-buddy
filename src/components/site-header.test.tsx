import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SiteHeader } from "@/components/site-header.tsx";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

describe("SiteHeader", () => {
  test("links the site's name home, in the header title's look", () => {
    render(<SiteHeader />);

    const name = within(screen.getByRole("banner")).getByRole("link", {
      name: SITE_COPY.name,
    });
    expect(name).toHaveAttribute("href", "/");
    expect(name).toHaveClass("header-title");
  });

  test("offers the theme picker", () => {
    render(<SiteHeader />);

    expect(
      within(screen.getByRole("banner")).getByRole("button", {
        name: THEME_COPY.picker,
      }),
    ).toBeInTheDocument();
  });

  test("links to Settings, beside the theme picker", () => {
    render(<SiteHeader />);

    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: SETTINGS_COPY.headerLink,
      }),
    ).toHaveAttribute("href", "/settings");
  });
});
