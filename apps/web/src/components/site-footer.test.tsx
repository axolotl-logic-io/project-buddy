import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SiteFooter } from "@/components/site-footer.tsx";
import { FOOTER_COPY } from "@/ui/copy/footer.ts";

describe("SiteFooter", () => {
  test("credits the manual and its license in one sentence", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Includes content adapted from the Blender Reference Manual, licensed under CC BY-SA 4.0.",
    );
  });

  test("credits the Blender Reference Manual", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "Blender Reference Manual" }),
    ).toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
  });

  test("gives its links the site's link look", () => {
    render(<SiteFooter />);

    for (const link of within(screen.getByRole("contentinfo")).getAllByRole(
      "link",
    )) {
      expect(link).toHaveClass("text-link");
    }
  });

  test("links to the CC BY-SA 4.0 license", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "CC BY-SA 4.0" }),
    ).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
  });
});

// "use_case_see_manual_credit" in use-cases/site-upkeep.md: the footer, on
// every page the root layout frames, signed out ones included, credits the
// manual and links to it and to its license.
describe("use_case_see_manual_credit", () => {
  test("links to the manual and to its license", () => {
    render(<SiteFooter />);

    const footer = within(screen.getByRole("contentinfo"));
    expect(
      footer.getByRole("link", { name: FOOTER_COPY.manual }),
    ).toHaveAttribute("href", "https://docs.blender.org/manual/en/latest/");
    expect(
      footer.getByRole("link", { name: FOOTER_COPY.license }),
    ).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
  });
});
