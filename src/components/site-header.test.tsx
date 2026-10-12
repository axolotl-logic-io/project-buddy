import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SiteHeader } from "@/components/site-header.tsx";
import { COPY } from "@/ui/copy.ts";

describe("SiteHeader", () => {
  test("links the site's name home, in the header title's look", () => {
    render(<SiteHeader />);

    const name = within(screen.getByRole("banner")).getByRole("link", {
      name: COPY.site.name,
    });
    expect(name).toHaveAttribute("href", "/");
    expect(name).toHaveClass("header-title");
  });

  test("offers the theme picker", () => {
    render(<SiteHeader />);

    expect(
      within(screen.getByRole("banner")).getByRole("button", {
        name: COPY.theme.picker,
      }),
    ).toBeInTheDocument();
  });
});
